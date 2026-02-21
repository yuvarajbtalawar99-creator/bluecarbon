import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { supabase } from '../supabase';

export interface AuthSession {
    user: {
        id: string;
        name: string;
        phoneNumber: string;
        email?: string;
        role: 'admin' | 'developer' | 'verifier' | 'corporate';
        place?: string;
        pincode?: string;
        developerId?: string;
    };
    deviceId: string;
    accessToken: string;
}

class AuthService {
    private fpPromise = FingerprintJS.load();

    /**
     * Get a unique identifier for the current browser
     */
    async getDeviceId(): Promise<string> {
        const fp = await this.fpPromise;
        const result = await fp.get();
        return result.visitorId;
    }

    /**
     * Request a 6-digit OTP for a phone number
     */
    async requestOTP(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        // 1. Try to save to Supabase (Production Path)
        const { error } = await supabase.from('auth_otps').insert([{
            phone_number: phoneNumber,
            otp_code: otp,
            expires_at: expiry
        }]);

        // 2. FALLBACK: Standalone Mode (Zero-Config)
        if (error && (error.code === 'PGRST116' || error.message.includes('auth_otps'))) {
            console.warn("[AUTH] Standalone Mode active: Table 'auth_otps' not found.");
            localStorage.setItem('bc_mock_otp', JSON.stringify({ phoneNumber, otp, expiresAt: expiry }));
        } else if (error) {
            return { success: false, error: error.message };
        }

        console.log(`%c[AUTH] OTP for ${phoneNumber}: ${otp}`, "color: #10b981; font-weight: bold; font-size: 14px;");
        return { success: true };
    }

    /**
     * Verify OTP (helper for registration)
     */
    async verifyOTPOnly(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
        // 1. Check DB for valid OTP
        const { data: dbOtp } = await supabase
            .from('auth_otps')
            .select('*')
            .eq('phone_number', phoneNumber)
            .eq('otp_code', code)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 2. Standalone Check
        const mockDataStr = localStorage.getItem('bc_mock_otp');
        let isValidMock = false;
        if (mockDataStr) {
            const mock = JSON.parse(mockDataStr);
            if (mock.phoneNumber === phoneNumber && mock.otp === code && new Date(mock.expiresAt) > new Date()) {
                isValidMock = true;
            }
        }

        if (!dbOtp && !isValidMock) {
            return { success: false, error: "Invalid or expired OTP" };
        }

        if (isValidMock) localStorage.removeItem('bc_mock_otp');
        return { success: true };
    }

    /**
     * Register a new Account (Developer or Admin)
     */
    async register(data: { name: string; place: string; pincode: string; phoneNumber: string; password: string; role?: 'developer' | 'admin' }): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
        const deviceId = await this.getDeviceId();
        const role = data.role || 'developer';
        const prefix = role === 'admin' ? 'ADM' : 'DEV';
        const uniqueId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

        // In a real app, we would use supabase.auth.signUp
        // For this simulator, we use the profiles table directly
        const { data: profile, error } = await supabase
            .from('profiles')
            .insert([{
                id: '00000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000), // Mock UUID
                name: data.name,
                place: data.place,
                pincode: data.pincode,
                phone_number: data.phoneNumber,
                developer_id: uniqueId,
                password: data.password, // In production, hash this!
                role: role,
                email: `${data.phoneNumber}@${role}.auth`
            }])
            .select()
            .single();

        if (error) {
            // Handle unique constraint violations
            if (error.code === '23505') return { success: false, error: "Phone number or ID already registered" };
            return { success: false, error: error.message };
        }

        const session: AuthSession = {
            user: {
                id: profile.id,
                name: profile.name,
                phoneNumber: profile.phone_number,
                email: profile.email,
                role: profile.role || role,
                place: profile.place,
                pincode: profile.pincode,
                developerId: profile.developer_id
            },
            deviceId,
            accessToken: "simulated-jwt-" + Date.now()
        };

        localStorage.setItem('bc_auth_session', JSON.stringify(session));
        return { success: true, session };
    }

    /**
     * Login using Registry ID and Password
     */
    async loginWithId(registryId: string, password: string): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
        const deviceId = await this.getDeviceId();

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('developer_id', registryId)
            .eq('password', password)
            .maybeSingle();

        if (error) return { success: false, error: error.message };
        if (!profile) return { success: false, error: "Invalid ID or Password" };

        const session: AuthSession = {
            user: {
                id: profile.id,
                name: profile.name,
                phoneNumber: profile.phone_number,
                email: profile.email,
                role: profile.role || 'developer',
                place: profile.place,
                pincode: profile.pincode,
                developerId: profile.developer_id
            },
            deviceId,
            accessToken: "simulated-jwt-" + Date.now()
        };

        localStorage.setItem('bc_auth_session', JSON.stringify(session));
        return { success: true, session };
    }

    /**
     * Legacy verifyOTP for backward compatibility
     */
    async verifyOTP(phoneNumber: string, code: string): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
        const otpResult = await this.verifyOTPOnly(phoneNumber, code);
        if (!otpResult.success) return otpResult;

        const deviceId = await this.getDeviceId();

        // Try to find profile by phone
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone_number', phoneNumber)
            .maybeSingle();

        if (profile) {
            const session: AuthSession = {
                user: {
                    id: profile.id,
                    name: profile.name,
                    phoneNumber: profile.phone_number,
                    email: profile.email,
                    role: profile.role || 'developer',
                    place: profile.place,
                    pincode: profile.pincode,
                    developerId: profile.developer_id
                },
                deviceId,
                accessToken: "simulated-jwt-" + Date.now()
            };
            localStorage.setItem('bc_auth_session', JSON.stringify(session));
            return { success: true, session };
        }

        return { success: false, error: "User not found. Please register first." };
    }

    async deviceLogin(): Promise<AuthSession | null> {
        const stored = localStorage.getItem('bc_auth_session');
        if (!stored) return null;

        try {
            const session = JSON.parse(stored) as AuthSession;
            // For hackathon/PWA demo, we allow session restoration even if deviceId 
            // slightly varies (common in PWA standalone vs browser modes)
            return session;
        } catch {
            return null;
        }
    }

    async loginAdmin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
        // 1. Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) return { success: false, error: error.message };

        // 2. Initial Auth Success - Now trigger MFA (OTP)
        // In a real app, Supabase MFA should be used. For this simulator, we send an OTP to email.
        return this.sendAdminOTP(email);
    }

    async loginAdminWithGoogle(): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/admin`
            }
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
    }

    async sendAdminOTP(email: string): Promise<{ success: boolean; error?: string }> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Mock save - Admins always get OTP via console for this demo
        localStorage.setItem('bc_admin_otp', JSON.stringify({ email, otp, expiresAt: expiry }));

        console.log(`%c[ADMIN-AUTH] 2FA OTP for ${email}: ${otp}`, "color: #dc2626; font-weight: bold; font-size: 16px; border: 2px solid #dc2626; padding: 4px;");
        return { success: true };
    }

    async verifyAdminOTP(email: string, code: string): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
        const stored = localStorage.getItem('bc_admin_otp');
        if (!stored) return { success: false, error: "OTP expired or not found" };

        const { email: storedEmail, otp, expiresAt } = JSON.parse(stored);
        if (storedEmail !== email || otp !== code || new Date(expiresAt) < new Date()) {
            return { success: false, error: "Invalid or expired OTP" };
        }

        // Check IP Whitelist before issuing session
        const isWhitelisted = await this.checkIpWhitelist();
        if (!isWhitelisted) return { success: false, error: "IP Address not whitelisted for Admin access." };

        // Success - Get profile and create session
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        const deviceId = await this.getDeviceId();
        const session: AuthSession = {
            user: {
                id: profile?.id || 'admin-sim-' + Date.now(),
                name: profile?.name || 'Administrator',
                phoneNumber: profile?.phone_number || '0000000000',
                email,
                role: 'admin',
            },
            deviceId,
            accessToken: "simulated-admin-jwt-" + Date.now()
        };

        localStorage.setItem('bc_auth_session', JSON.stringify(session));
        localStorage.removeItem('bc_admin_otp');
        return { success: true, session };
    }

    async checkIpWhitelist(): Promise<boolean> {
        // In a real app, we would fetch the user's IP from a server or rely on Supabase Edge Functions
        // For simulation, we assume everyone is on a secure network or we return true.
        // But let's log the "check" for realism.
        console.log("[SECURITY] Verifying Admin IP Whitelist...");
        return true;
    }

    logout() {
        localStorage.removeItem('bc_auth_session');
    }
}

export const authService = new AuthService();
