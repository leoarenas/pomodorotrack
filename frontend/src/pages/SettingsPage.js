import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTimerSettings, NOTIFICATION_SOUNDS } from '../hooks/useTimerSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  User, 
  Building2, 
  Settings2, 
  Crown,
  Plus,
  Timer,
  Volume2,
  Play,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { user, company, createCompany, hasCompany } = useAuth();
  const { settings, updateSettings, resetToDefaults, previewSound } = useTimerSettings();
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    
    setLoading(true);
    try {
      await createCompany(companyName);
      toast.success('¡Empresa creada exitosamente!');
      setIsCreateCompanyOpen(false);
      setCompanyName('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleDurationChange = (key, value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 120) {
      updateSettings({ [key]: numValue });
      toast.success('Configuración guardada');
    }
  };

  const handleSoundChange = (soundKey) => {
    updateSettings({ selectedSound: soundKey });
    previewSound(soundKey);
    toast.success('Sonido actualizado');
  };

  const handleVolumeChange = (value) => {
    updateSettings({ soundVolume: value[0] });
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    toast.success('Configuración restablecida');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <Crown className="w-3 h-3 mr-1" />
            Propietario
          </Badge>
        );
      case 'admin':
        return <Badge variant="default">Admin</Badge>;
      default:
        return <Badge variant="secondary">Usuario</Badge>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-4xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu perfil y configuración de la aplicación
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil
          </CardTitle>
          <CardDescription>
            Tu información personal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{user?.displayName}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
              {getRoleBadge(user?.role)}
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">ID de Usuario</Label>
              <p className="font-mono text-sm">{user?.uid?.slice(0, 8)}...</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Miembro desde</Label>
              <p className="text-sm">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Empresa
          </CardTitle>
          <CardDescription>
            {hasCompany ? 'Información de tu empresa' : 'Crea o únete a una empresa'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasCompany ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{company?.name}</h3>
                  <Badge 
                    variant={company?.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                    className={company?.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}
                  >
                    {company?.subscriptionStatus === 'active' ? 'Activo' : company?.subscriptionStatus}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">ID de Empresa</Label>
                  <p className="font-mono text-sm">{company?.companyId?.slice(0, 8)}...</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Creada</Label>
                  <p className="text-sm">
                    {company?.createdAt ? new Date(company.createdAt).toLocaleDateString('es', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Sin empresa</h3>
              <p className="text-muted-foreground mb-4">
                Crea una empresa para comenzar a gestionar proyectos y equipos
              </p>
              
              <Dialog open={isCreateCompanyOpen} onOpenChange={setIsCreateCompanyOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" data-testid="create-company-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Empresa</DialogTitle>
                    <DialogDescription>
                      Crea tu empresa para empezar a colaborar con tu equipo
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateCompany} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nombre de la empresa</Label>
                      <Input
                        id="company-name"
                        data-testid="company-name-input"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Mi Empresa S.A."
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full btn-primary" 
                      disabled={loading}
                      data-testid="submit-company-btn"
                    >
                      {loading ? 'Creando...' : 'Crear Empresa'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timer Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Duración del Timer
              </CardTitle>
              <CardDescription>
                Personaliza la duración de tus sesiones
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetDefaults}
              className="text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restablecer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Work Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="work-duration">Pomodoro (minutos)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="work-duration"
                  data-testid="work-duration-input"
                  type="number"
                  min="1"
                  max="120"
                  value={settings.workDuration}
                  onChange={(e) => handleDurationChange('workDuration', e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
              <p className="text-xs text-muted-foreground">Recomendado: 25 min</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="short-break">Descanso corto (minutos)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="short-break"
                  data-testid="short-break-input"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.shortBreakDuration}
                  onChange={(e) => handleDurationChange('shortBreakDuration', e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
              <p className="text-xs text-muted-foreground">Recomendado: 5 min</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="long-break">Descanso largo (minutos)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="long-break"
                  data-testid="long-break-input"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.longBreakDuration}
                  onChange={(e) => handleDurationChange('longBreakDuration', e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
              <p className="text-xs text-muted-foreground">Recomendado: 15 min</p>
            </div>
          </div>

          <Separator />

          {/* Pomodoros until long break */}
          <div className="space-y-2">
            <Label htmlFor="pomodoros-until-long">Pomodoros hasta descanso largo</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pomodoros-until-long"
                data-testid="pomodoros-until-long-input"
                type="number"
                min="1"
                max="10"
                value={settings.pomodorosUntilLongBreak}
                onChange={(e) => handleDurationChange('pomodorosUntilLongBreak', e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">pomodoros</span>
            </div>
            <p className="text-xs text-muted-foreground">Después de completar este número de pomodoros, se sugerirá un descanso largo</p>
          </div>
        </CardContent>
      </Card>

      {/* Sound Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Sonidos
          </CardTitle>
          <CardDescription>
            Configura las notificaciones de audio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sound Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sonido de notificación</p>
              <p className="text-sm text-muted-foreground">Reproducir sonido al completar un pomodoro</p>
            </div>
            <Switch
              data-testid="sound-toggle"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
            />
          </div>

          <Separator />

          {/* Sound Selection */}
          <div className="space-y-3">
            <Label>Tipo de sonido</Label>
            <div className="flex items-center gap-3">
              <Select
                value={settings.selectedSound}
                onValueChange={handleSoundChange}
                disabled={!settings.soundEnabled}
              >
                <SelectTrigger className="w-[200px]" data-testid="sound-select">
                  <SelectValue placeholder="Selecciona un sonido" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTIFICATION_SOUNDS).map(([key, sound]) => (
                    <SelectItem key={key} value={key}>
                      {sound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => previewSound(settings.selectedSound)}
                disabled={!settings.soundEnabled}
                data-testid="preview-sound-btn"
              >
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Volume Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Volumen</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            <Slider
              data-testid="volume-slider"
              value={[settings.soundVolume]}
              onValueChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.1}
              disabled={!settings.soundEnabled}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Acerca de
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Versión</span>
            <Badge variant="outline">1.1.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Técnica</span>
            <span className="text-sm">Pomodoro (Francesco Cirillo)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
