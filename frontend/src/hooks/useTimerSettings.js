import { useState, useEffect, useCallback } from 'react';

// Default timer settings
const DEFAULT_SETTINGS = {
  workDuration: 25, // minutes
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosUntilLongBreak: 4,
  soundEnabled: true,
  soundVolume: 0.7,
  selectedSound: 'bell', // bell, chime, digital, gentle
};

// Available notification sounds
export const NOTIFICATION_SOUNDS = {
  bell: {
    name: 'Campana',
    url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
  },
  chime: {
    name: 'Campanilla',
    url: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3'
  },
  digital: {
    name: 'Digital',
    url: 'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3'
  },
  gentle: {
    name: 'Suave',
    url: 'https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3'
  },
};

const STORAGE_KEY = 'pomodorotrack_settings';

export const useTimerSettings = () => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Get durations in seconds for the timer
  const getDurations = useCallback(() => ({
    work: settings.workDuration * 60,
    break: settings.shortBreakDuration * 60,
    long_break: settings.longBreakDuration * 60,
  }), [settings]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (!settings.soundEnabled) return;
    
    const sound = NOTIFICATION_SOUNDS[settings.selectedSound];
    if (sound) {
      const audio = new Audio(sound.url);
      audio.volume = settings.soundVolume;
      audio.play().catch(err => console.warn('Could not play sound:', err));
    }
  }, [settings.soundEnabled, settings.selectedSound, settings.soundVolume]);

  // Preview a sound
  const previewSound = useCallback((soundKey) => {
    const sound = NOTIFICATION_SOUNDS[soundKey];
    if (sound) {
      const audio = new Audio(sound.url);
      audio.volume = settings.soundVolume;
      audio.play().catch(err => console.warn('Could not play sound:', err));
    }
  }, [settings.soundVolume]);

  return {
    settings,
    updateSettings,
    resetToDefaults,
    getDurations,
    playSound,
    previewSound,
  };
};

export default useTimerSettings;
