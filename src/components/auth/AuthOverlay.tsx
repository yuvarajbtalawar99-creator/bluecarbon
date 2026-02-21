import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ShieldCheck, Phone, CheckCircle2, Loader2, ArrowRight,
    Smartphone, User, MapPin, Lock, Key, ChevronLeft, Globe
} from "lucide-react";
import { authService, AuthSession } from "@/lib/auth/authService";
import { toast } from "sonner";

interface AuthOverlayProps {
    onAuthenticated: (session: AuthSession) => void;
}

type AuthMode = "phone-login" | "register" | "id-password-login";

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onAuthenticated }) => {
    const [mode, setMode] = useState<AuthMode>("phone-login");
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
    const [developerId, setDeveloperId] = useState("");

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
        // Step 2: Register
        const result = await authService.register({ name, place, pincode, phoneNumber, password });
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
            onAuthenticated(result.session);
        } else {
            toast.error(result.error);
        }
    };

    const handleIdPasswordLogin = async () => {
        if (!developerId || !password) {
            toast.error("Enter Developer ID and Password");
            return;
        }
        setIsLoading(true);
        const result = await authService.loginWithId(developerId, password);
        setIsLoading(false);
        if (result.success && result.session) {
            toast.success("Login successful");
            onAuthenticated(result.session);
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-gov-blue/10 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-gov-blue p-8 text-white text-center space-y-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                    <div className="bg-white/20 w-16 h-16 rounded-2xl backdrop-blur-md mx-auto flex items-center justify-center mb-2">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold font-serif">
                        {mode === "register" ? "Registry Signup" : "Registry Login"}
                    </h2>
                    <p className="text-xs text-white/70">Verified access for Project Developers</p>
                </div>

                <div className="p-8 space-y-6">
                    {/* MODE: PHONE LOGIN */}
                    {mode === "phone-login" && (
                        <div className="space-y-4">
                            {step === 1 ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type="tel"
                                                placeholder="Mobile Number"
                                                className="pl-10 rounded-xl h-12"
                                                value={phoneNumber}
                                                onChange={e => setPhoneNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button className="w-full h-12 rounded-xl bg-gov-blue shadow-lg" onClick={handleRequestOTP} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : "Send OTP"}
                                    </Button>
                                    <button onClick={() => setMode("id-password-login")} className="w-full text-xs text-gov-blue font-semibold hover:underline">
                                        Login with Developer ID
                                    </button>
                                    <button onClick={() => { setMode("register"); setStep(1); }} className="w-full text-xs text-muted-foreground">
                                        New here? <span className="text-gov-blue font-bold">Create Account</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-center block">OTP sent to +91 {phoneNumber}</Label>
                                        <Input
                                            placeholder="6-digit OTP"
                                            className="text-center text-2xl tracking-widest h-14 rounded-xl"
                                            maxLength={6}
                                            value={otp}
                                            onChange={e => setOtp(e.target.value)}
                                        />
                                    </div>
                                    <Button className="w-full h-12 rounded-xl bg-carbon-green shadow-lg" onClick={handlePhoneLogin} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Login"}
                                    </Button>
                                    <button onClick={() => setStep(1)} className="w-full text-xs text-muted-foreground underline">Resend or Change Number</button>
                                </>
                            )}
                        </div>
                    )}

                    {/* MODE: ID-PASSWORD LOGIN */}
                    {mode === "id-password-login" && (
                        <div className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Developer ID</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="DEV-XXXX"
                                            className="pl-10 rounded-xl h-12"
                                            value={developerId}
                                            onChange={e => setDeveloperId(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="password"
                                            placeholder="Your Password"
                                            className="pl-10 rounded-xl h-12"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button className="w-full h-12 rounded-xl bg-gov-blue shadow-lg" onClick={handleIdPasswordLogin} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : "Login to Dashboard"}
                            </Button>
                            <button onClick={() => setMode("phone-login")} className="w-full text-xs text-gov-blue font-semibold hover:underline">
                                Login with Phone Number
                            </button>
                        </div>
                    )}

                    {/* MODE: REGISTER */}
                    {mode === "register" && (
                        <div className="space-y-4">
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Full Name</Label>
                                        <Input placeholder="E.g. Ramesh Kumar" className="rounded-xl h-11" value={name} onChange={e => setName(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Place</Label>
                                            <Input placeholder="City/State" className="rounded-xl h-11" value={place} onChange={e => setPlace(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Pincode</Label>
                                            <Input placeholder="400001" className="rounded-xl h-11" value={pincode} onChange={e => setPincode(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Number</Label>
                                        <Input type="tel" placeholder="+91 XXXX" className="rounded-xl h-11" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                                    </div>
                                    <Button className="w-full h-11 rounded-xl bg-gov-blue" onClick={handleRequestOTP} disabled={isLoading}>
                                        Continue & Verify Mobile
                                    </Button>
                                    <button onClick={() => setMode("phone-login")} className="w-full text-xs text-muted-foreground underline text-center">Back to Login</button>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 text-center">
                                    <p className="text-xs text-muted-foreground">Verification code sent to {phoneNumber}</p>
                                    <Input placeholder="OTP" className="text-center text-xl h-14 rounded-xl" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} />
                                    <Button className="w-full h-11 rounded-xl bg-carbon-green" onClick={() => setStep(3)}>Verify Code</Button>
                                    <button onClick={() => setStep(1)} className="text-xs text-gov-blue">Change Number</button>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Set Password</Label>
                                        <Input type="password" placeholder="Create Password" className="rounded-xl h-11" value={password} onChange={e => setPassword(e.target.value)} />
                                    </div>
                                    <Button className="w-full h-11 rounded-xl bg-carbon-green shadow-lg" onClick={handleVerifyAndRegister} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : "Complete Registration"}
                                    </Button>
                                    <p className="text-[10px] text-center text-muted-foreground italic">Your unique Developer ID will be generated after signup.</p>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="py-6 text-center space-y-4 animate-in zoom-in">
                                    <div className="w-16 h-16 bg-carbon-green/10 rounded-full flex items-center justify-center mx-auto text-carbon-green">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Account Created!</h3>
                                        <div className="mt-3 p-3 bg-muted rounded-xl border border-dashed border-muted-foreground/30">
                                            <p className="text-[10px] text-muted-foreground uppercase">Your Developer ID</p>
                                            <p className="text-2xl font-serif font-bold text-gov-blue tracking-wider">
                                                {localStorage.getItem('bc_auth_session') ? JSON.parse(localStorage.getItem('bc_auth_session')!).user.developerId : "GENERATING..."}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-4">Logging you in... Please save your ID.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-muted/30 border-t border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                        Device ID: {deviceId.substring(0, 8)}... Fingerprint Locked
                    </p>
                </div>
            </div>
        </div>
    );
};
