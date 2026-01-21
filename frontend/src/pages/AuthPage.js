import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Timer, Building2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export const AuthPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(loginEmail, loginPassword);
      toast.success('¡Bienvenido de nuevo!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      const firebaseError = error.code;
      let errorMessage = error.response?.data?.detail || error.message || 'Error al iniciar sesión';
      
      if (firebaseError === 'auth/user-not-found' || firebaseError === 'auth/wrong-password') {
        errorMessage = 'Credenciales inválidas';
      } else if (firebaseError === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido';
      } else if (firebaseError === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Intenta más tarde.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await register(registerEmail, registerPassword, displayName, companyName);
      toast.success('¡Cuenta creada exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      // Handle Firebase specific errors
      const firebaseError = error.code;
      let errorMessage = error.response?.data?.detail || error.message || 'Error al crear cuenta';
      
      if (firebaseError === 'auth/email-already-in-use') {
        errorMessage = 'Este correo ya está registrado';
      } else if (firebaseError === 'auth/weak-password') {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      } else if (firebaseError === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary" />
          <div className="absolute bottom-40 right-20 w-96 h-96 rounded-full bg-primary" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Timer className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">PomodoroTrack</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Mide tu productividad.<br />
            <span className="text-primary">Mejora cada día.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-md">
            La plataforma SaaS que combina time tracking + técnica Pomodoro para equipos que buscan resultados reales.
          </p>
        </div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-background/10 flex items-center justify-center">
              <Timer className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">Pomodoro Timer</p>
              <p className="text-sm text-muted-foreground">25 min focus, 5 min break</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-background/10 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">Multi-empresa</p>
              <p className="text-sm text-muted-foreground">Datos aislados por compañía</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Timer className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">PomodoroTrack</span>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login" data-testid="login-tab">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card className="border-0 shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">¡Hola de nuevo!</CardTitle>
                  <CardDescription>
                    Ingresa tus credenciales para continuar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Correo electrónico</Label>
                      <Input
                        id="login-email"
                        data-testid="login-email-input"
                        type="email"
                        placeholder="tu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          data-testid="login-password-input"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      data-testid="login-submit-btn"
                      className="w-full btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card className="border-0 shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Crea tu cuenta</CardTitle>
                  <CardDescription>
                    Comienza a medir tu productividad hoy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nombre completo</Label>
                      <Input
                        id="register-name"
                        data-testid="register-name-input"
                        type="text"
                        placeholder="Juan Pérez"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Correo electrónico</Label>
                      <Input
                        id="register-email"
                        data-testid="register-email-input"
                        type="email"
                        placeholder="tu@email.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          data-testid="register-password-input"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-company">
                        Nombre de empresa <span className="text-muted-foreground">(opcional)</span>
                      </Label>
                      <Input
                        id="register-company"
                        data-testid="register-company-input"
                        type="text"
                        placeholder="Mi Empresa S.A."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Puedes crear la empresa después si lo prefieres
                      </p>
                    </div>
                    
                    <Button
                      type="submit"
                      data-testid="register-submit-btn"
                      className="w-full btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
