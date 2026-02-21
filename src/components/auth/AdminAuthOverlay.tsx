import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Shield, Phone, CheckCircle2, Loader2, ArrowRight,
    Smartphone, User, MapPin, Lock, Key, ChevronLeft, Globe, Chrome, Hexagon
} from "lucide-react";
import { authService, AuthSession } from "@/lib/auth/authService";
import { toast } from "sonner";

interface AdminAuthOverlayProps {
    onAuthenticated: (session: AuthSession) => void;
}

type AuthMode = "phone-login" | "register" | "id-password-login";

export const AdminAuthOverlay: React.FC<AdminAuthOverlayProps> = ({ onAuthenticated }) => {
    const [mode, setMode] = useState<AuthMode>("id-password-login");
    const [step, setStep] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [deviceId, setDeviceId] = useState<string>("");

    // Form States
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [name, setName] = useState("");
    const [place, setPlace] = useState("");
    const [pincode, setPincode] = useState("");
    const [password, setPassword] = useState("");
    const [adminId, setAdminId] = useState("");

    useEffect(() => {
        authService.getDeviceId().then(setDeviceId);
    }, []);

    // Handlers
    const handleRequestOTP = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            toast.error("Enter a valid phone number");
            return;
        }
        setIsLoading(true);
        const result = await authService.requestOTP(phoneNumber);
        setIsLoading(false);
        if (result.success) {
            setStep(step + 1);
            toast.success("OTP sent to your device");
        } else {
            toast.error(result.error);
        }
    };

    const handleVerifyAndRegister = async () => {
        setIsLoading(true);
        // Step 1: Verify OTP
        const otpResult = await authService.verifyOTPOnly(phoneNumber, otp);
        if (!otpResult.success) {
            setIsLoading(false);
            toast.error(otpResult.error);
            return;
        }
        // Step 2: Register as Admin
        const result = await authService.register({ name, place, pincode, phoneNumber, password, role: 'admin' });
        setIsLoading(false);
        if (result.success && result.session) {
            setStep(4); // Success step
            setTimeout(() => onAuthenticated(result.session!), 3000);
        } else {
            toast.error(result.error);
        }
    };

    const handlePhoneLogin = async () => {
        setIsLoading(true);
        const result = await authService.verifyOTP(phoneNumber, otp);
        setIsLoading(false);
        if (result.success && result.session) {
            if (result.session.user.role !== 'admin') {
                toast.error("Access denied: Not an administrator account.");
                return;
            }
            onAuthenticated(result.session);
        } else {
            toast.error(result.error);
        }
    };

    const handleIdPasswordLogin = async () => {
        if (!adminId || !password) {
            toast.error("Enter Admin ID and Password");
            return;
        }
        setIsLoading(true);
        const result = await authService.loginWithId(adminId, password);
        setIsLoading(false);
        if (result.success && result.session) {
            if (result.session.user.role !== 'admin') {
                toast.error("Access denied: Not an administrator account.");
                return;
            }
            toast.success("Admin login successful");
            onAuthenticated(result.session);
        } else {
            toast.error(result.error);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        const result = await authService.loginAdminWithGoogle();
        if (!result.success) {
            setIsLoading(false);
            toast.error(result.error);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/20 backdrop-blur-xl flex items-center justify-center p-4">
            {/* Background decorative elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gov-blue/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-carbon-green/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-slate-900 p-8 text-white text-center space-y-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    <div className="bg-white/10 w-16 h-16 rounded-2xl backdrop-blur-md mx-auto flex items-center justify-center mb-2 border border-white/20 shadow-inner">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold font-serif tracking-tight">
                        {mode === "register" ? "System Registration" : "System Authority"}
                    </h2>
                    <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        Restricted Access
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {/* MODE: PHONE LOGIN */}
                    {mode === "phone-login" && (
                        <div className="space-y-4">
                            {step === 1 ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mobile Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="tel"
                                                placeholder="Mobile Number"
                                                className="pl-10 rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                                value={phoneNumber}
                                                onChange={e => setPhoneNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button className="w-full h-12 rounded-xl bg-slate-900 shadow-lg text-white font-bold" onClick={handleRequestOTP} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : "Verify via OTP"}
                                    </Button>
                                    <button onClick={() => setMode("id-password-login")} className="w-full text-xs text-slate-900 font-semibold hover:underline">
                                        Login with Admin ID
                                    </button>
                                    <button onClick={() => { setMode("register"); setStep(1); }} className="w-full text-xs text-muted-foreground">
                                        New Admin? <span className="text-slate-900 font-bold">Request Access</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-center block text-slate-500">OTP sent to +91 {phoneNumber}</Label>
                                        <Input
                                            placeholder="6-digit OTP"
                                            className="text-center text-2xl tracking-widest h-14 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-slate-900"
                                            maxLength={6}
                                            value={otp}
                                            onChange={e => setOtp(e.target.value)}
                                        />
                                    </div>
                                    <Button className="w-full h-12 rounded-xl bg-slate-900 shadow-lg text-white font-bold" onClick={handlePhoneLogin} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Authorize"}
                                    </Button>
                                    <button onClick={() => setStep(1)} className="w-full text-xs text-muted-foreground underline text-center">Resend or Change Number</button>
                                </>
                            )}
                        </div>
                    )}

                    {/* MODE: ID-PASSWORD LOGIN */}
                    {mode === "id-password-login" && (
                        <div className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin ID</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="ADM-XXXX"
                                            className="pl-10 rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            value={adminId}
                                            onChange={e => setAdminId(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</Label>
                                        <button className="text-[10px] text-gov-blue font-bold hover:underline">Forgot?</button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-10 rounded-xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button className="w-full h-12 rounded-xl bg-slate-900 shadow-lg text-white font-bold" onClick={handleIdPasswordLogin} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : "Verify Identity"}
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400"><span className="bg-white px-3 tracking-widest">Government IdP</span></div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-xl flex items-center justify-center gap-3 border-slate-200 hover:bg-slate-50 transition-all font-semibold"
                                onClick={handleGoogleLogin}
                            >
                                <Chrome className="w-5 h-5 text-red-500" />
                                Continue with Google
                            </Button>

                            <div className="pt-2 flex flex-col gap-3">
                                <button onClick={() => setMode("phone-login")} className="w-full text-xs text-slate-600 font-semibold hover:underline text-center">
                                    Login with Mobile Number
                                </button>
                                <button onClick={() => { setMode("register"); setStep(1); }} className="w-full text-xs text-muted-foreground text-center">
                                    Need access? <span className="text-slate-900 font-bold">Request Account</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* MODE: REGISTER */}
                    {mode === "register" && (
                        <div className="space-y-4">
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</Label>
                                        <Input placeholder="E.g. Admin User" className="rounded-xl h-11 bg-slate-50" value={name} onChange={e => setName(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Department</Label>
                                            <Input placeholder="Registry/Climate" className="rounded-xl h-11 bg-slate-50" value={place} onChange={e => setPlace(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Branch Code</Label>
                                            <Input placeholder="110001" className="rounded-xl h-11 bg-slate-50" value={pincode} onChange={e => setPincode(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Mobile Number</Label>
                                        <Input type="tel" placeholder="+91 XXXX" className="rounded-xl h-11 bg-slate-50" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                                    </div>
                                    <Button className="w-full h-11 rounded-xl bg-slate-900 text-white font-bold" onClick={handleRequestOTP} disabled={isLoading}>
                                        Continue to Verification
                                    </Button>
                                    <button onClick={() => setMode("id-password-login")} className="w-full text-xs text-muted-foreground underline text-center">Back to Sign In</button>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 text-center">
                                    <p className="text-xs text-muted-foreground">Security code sent to {phoneNumber}</p>
                                    <Input placeholder="OTP" className="text-center text-xl h-14 rounded-xl bg-slate-50" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} />
                                    <Button className="w-full h-11 rounded-xl bg-slate-900 text-white font-bold" onClick={() => setStep(3)}>Verify Code</Button>
                                    <button onClick={() => setStep(1)} className="text-xs text-slate-900 underline">Change Number</button>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Set Security Password</Label>
                                        <Input type="password" placeholder="Min 8 characters" className="rounded-xl h-11 bg-slate-50" value={password} onChange={e => setPassword(e.target.value)} />
                                    </div>
                                    <Button className="w-full h-11 rounded-xl bg-slate-900 shadow-lg text-white font-bold" onClick={handleVerifyAndRegister} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : "Initialize Admin Profile"}
                                    </Button>
                                    <p className="text-[10px] text-center text-muted-foreground italic">Your unique Admin ID will be generated upon initialization.</p>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="py-6 text-center space-y-4 animate-in zoom-in">
                                    <div className="w-16 h-16 bg-carbon-green/10 rounded-full flex items-center justify-center mx-auto text-carbon-green">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Credential Issued!</h3>
                                        <div className="mt-3 p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Your Admin ID</p>
                                            <p className="text-2xl font-serif font-bold text-slate-900 tracking-wider">
                                                {localStorage.getItem('bc_auth_session') ? JSON.parse(localStorage.getItem('bc_auth_session')!).user.developerId : "INITIALIZING..."}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-4">Authorized entry... Save your ID for future sessions.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center">
                        <Hexagon className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Certified</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex flex-col items-center">
                        <Globe className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Encrypted</span>
                    </div>
                </div>

                <div className="p-3 bg-slate-900 text-center">
                    <p className="text-[10px] text-white/40 leading-relaxed font-mono">
                        TERMINAL ID: {deviceId.substring(0, 8).toUpperCase()}
                    </p>
                </div>
            </div>
        </div>
    );
};
