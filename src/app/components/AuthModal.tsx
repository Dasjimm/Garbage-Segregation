"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/lib/supabase";
import { Eye, EyeOff, Mail, Lock, User, LogIn, UserPlus, X, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

type AuthMode = "login" | "signup";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  initialMode?: AuthMode;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = "login" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [validation, setValidation] = useState({
    name: { isValid: false, touched: false, message: "" },
    email: { isValid: false, touched: false, message: "" },
    password: { isValid: false, touched: false, message: "" },
    confirmPassword: { isValid: false, touched: false, message: "" }
  });

  useEffect(() => {
    if (isOpen && pathname) {
      sessionStorage.setItem('redirectAfterLogin', pathname);
    }
    
    if (!isOpen) {
      setForm(emptyForm);
      setError("");
      setSuccess("");
      setValidation({
        name: { isValid: false, touched: false, message: "" },
        email: { isValid: false, touched: false, message: "" },
        password: { isValid: false, touched: false, message: "" },
        confirmPassword: { isValid: false, touched: false, message: "" }
      });
    }
  }, [isOpen, pathname]);

  if (!isOpen) return null;

  const validateName = (name: string) => {
    if (name.trim().length < 2) {
      return { isValid: false, message: "Name must be at least 2 characters" };
    }
    if (name.trim().length > 50) {
      return { isValid: false, message: "Name must be less than 50 characters" };
    }
    return { isValid: true, message: "" };
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return { isValid: false, message: "Email is required" };
    }
    if (!emailRegex.test(email)) {
      return { isValid: false, message: "Please enter a valid email address" };
    }
    return { isValid: true, message: "" };
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return { isValid: false, message: "Password must be at least 6 characters" };
    }
    if (password.length > 50) {
      return { isValid: false, message: "Password must be less than 50 characters" };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: "Include at least one uppercase letter" };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: "Include at least one number" };
    }
    return { isValid: true, message: "" };
  };

  const validateConfirmPassword = (confirmPassword: string) => {
    if (confirmPassword !== form.password) {
      return { isValid: false, message: "Passwords do not match" };
    }
    return { isValid: true, message: "" };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    setValidation(prev => {
      const newValidation = { ...prev };
      
      switch(name) {
        case 'name':
          if (mode === 'signup') {
            const nameValidation = validateName(value);
            newValidation.name = { 
              ...nameValidation, 
              touched: true 
            };
          }
          break;
        case 'email':
          const emailValidation = validateEmail(value);
          newValidation.email = { 
            ...emailValidation, 
            touched: true 
          };
          break;
        case 'password':
          const passwordValidation = validatePassword(value);
          newValidation.password = { 
            ...passwordValidation, 
            touched: true 
          };
          if (form.confirmPassword) {
            const confirmValidation = validateConfirmPassword(form.confirmPassword);
            newValidation.confirmPassword = { 
              ...confirmValidation, 
              touched: true 
            };
          }
          break;
        case 'confirmPassword':
          const confirmValidation = validateConfirmPassword(value);
          newValidation.confirmPassword = { 
            ...confirmValidation, 
            touched: true 
          };
          break;
      }
      
      return newValidation;
    });

    if (error) setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      mode === "login" ? handleLogin() : handleSignup();
    }
  };

  const handleModeSwitch = () => {
    setMode(mode === "login" ? "signup" : "login");
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setValidation({
      name: { isValid: false, touched: false, message: "" },
      email: { isValid: false, touched: false, message: "" },
      password: { isValid: false, touched: false, message: "" },
      confirmPassword: { isValid: false, touched: false, message: "" }
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSignup = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const nameValidation = validateName(form.name);
    const emailValidation = validateEmail(form.email);
    const passwordValidation = validatePassword(form.password);
    const confirmValidation = validateConfirmPassword(form.confirmPassword);

    setValidation({
      name: { ...nameValidation, touched: true },
      email: { ...emailValidation, touched: true },
      password: { ...passwordValidation, touched: true },
      confirmPassword: { ...confirmValidation, touched: true }
    });

    if (!nameValidation.isValid || !emailValidation.isValid || 
        !passwordValidation.isValid || !confirmValidation.isValid) {
      setError("Please fix the errors above");
      setLoading(false);
      return;
    }

    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', form.email)
        .single();

      if (existingUser) {
        setError("Email already registered. Please use a different email or login.");
        setLoading(false);
        return;
      }

      const { error, data } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        setSuccess("Account created successfully! You can now log in.");
        
        setTimeout(() => {
          setMode("login");
          setForm({
            ...emptyForm,
            email: form.email,
          });
          setSuccess("");
        }, 2000);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const emailValidation = validateEmail(form.email);
    if (!emailValidation.isValid) {
      setValidation(prev => ({
        ...prev,
        email: { ...emailValidation, touched: true }
      }));
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (!form.password) {
      setError("Please enter your password");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) throw error;

      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
          
          if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin');
            router.push(redirectUrl);
          } else {
            router.push('/dashboard');
          }
          
          if (onAuthSuccess) onAuthSuccess();
          onClose();
          return;
        }
        
        attempts++;
      }
      
      setError("Login succeeded but session not established. Please refresh the page.");
      setLoading(false);
      
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message.includes('Invalid login credentials')) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(error.message || "Login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  const isSignupValid = () => {
    if (mode === 'signup') {
      return validation.name.isValid && 
             validation.email.isValid && 
             validation.password.isValid && 
             validation.confirmPassword.isValid;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md rounded-xl bg-white p-6 font-sans shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-20 h-20 relative">
                  <Image
                    src="/wastelogo.png"
                    alt="EcoWaste Logo"
                    width={80}
                    height={80}
                    className="object-contain w-full h-full"
                  />
                </div>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-teal-900">
                {mode === "login" ? "Admin Login" : "Create Admin Account"}
              </h2>
              <p className="mt-1.5 text-sm text-teal-900/80">
                {mode === "login"
                  ? "Sign in to access the admin dashboard"
                  : "Register a new admin account"}
              </p>
            </div>

            {mode === "login" ? (
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={handleChange}
                    className={`w-full rounded-lg border ${
                      validation.email.touched && !validation.email.isValid
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-teal-400'
                    } pl-10 pr-4 py-2.5 text-sm focus:outline-none`}
                    disabled={loading}
                  />
                  {validation.email.touched && validation.email.isValid && (
                    <CheckCircle className="absolute right-3 top-3 text-green-500" size={16} />
                  )}
                </div>
                {validation.email.touched && !validation.email.isValid && (
                  <p className="text-xs text-red-500 mt-1">{validation.email.message}</p>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 pl-10 pr-10 py-2.5 text-sm focus:border-teal-400 focus:outline-none"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-900"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="name"
                    type="text"
                    placeholder="Full Name"
                    value={form.name}
                    onChange={handleChange}
                    className={`w-full rounded-lg border ${
                      validation.name.touched && !validation.name.isValid
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-teal-400'
                    } pl-10 pr-4 py-2.5 text-sm focus:outline-none`}
                    disabled={loading}
                  />
                  {validation.name.touched && validation.name.isValid && (
                    <CheckCircle className="absolute right-3 top-3 text-green-500" size={16} />
                  )}
                </div>
                {validation.name.touched && !validation.name.isValid && (
                  <p className="text-xs text-red-500 mt-1">{validation.name.message}</p>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={handleChange}
                    className={`w-full rounded-lg border ${
                      validation.email.touched && !validation.email.isValid
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-teal-400'
                    } pl-10 pr-4 py-2.5 text-sm focus:outline-none`}
                    disabled={loading}
                  />
                  {validation.email.touched && validation.email.isValid && (
                    <CheckCircle className="absolute right-3 top-3 text-green-500" size={16} />
                  )}
                </div>
                {validation.email.touched && !validation.email.isValid && (
                  <p className="text-xs text-red-500 mt-1">{validation.email.message}</p>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className={`w-full rounded-lg border ${
                      validation.password.touched && !validation.password.isValid
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-teal-400'
                    } pl-10 pr-10 py-2.5 text-sm focus:outline-none`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-900"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {validation.password.touched && validation.password.isValid && (
                    <CheckCircle className="absolute right-10 top-3 text-green-500" size={16} />
                  )}
                </div>
                {validation.password.touched && !validation.password.isValid && (
                  <p className="text-xs text-red-500 mt-1">{validation.password.message}</p>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={`w-full rounded-lg border ${
                      validation.confirmPassword.touched && !validation.confirmPassword.isValid
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-teal-400'
                    } pl-10 pr-10 py-2.5 text-sm focus:outline-none`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-900"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {validation.confirmPassword.touched && validation.confirmPassword.isValid && (
                    <CheckCircle className="absolute right-10 top-3 text-green-500" size={16} />
                  )}
                </div>
                {validation.confirmPassword.touched && !validation.confirmPassword.isValid && (
                  <p className="text-xs text-red-500 mt-1">{validation.confirmPassword.message}</p>
                )}

                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle size={16} />
                    {success}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={mode === "login" ? handleLogin : handleSignup}
                disabled={loading || (mode === 'signup' && !isSignupValid())}
                className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                ) : mode === "login" ? (
                  <div className="flex items-center justify-center gap-2">
                    <LogIn size={16} />
                    Sign In
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <UserPlus size={16} />
                    Create Account
                  </div>
                )}
              </button>

              <button
                onClick={handleModeSwitch}
                disabled={loading}
                className="w-full py-1 text-sm text-teal-900/80 hover:text-teal-900"
              >
                {mode === "login"
                  ? "Need an admin account? Sign Up"
                  : "Already have an admin account? Sign In"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}