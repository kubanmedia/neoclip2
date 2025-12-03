import React from 'react';

export interface UserState {
  isPremium: boolean;
  credits: number; // For "Ultra" mode or API limits
  referralCount: number;
  hasSelectedKey: boolean;
  watermarkSettings: WatermarkSettings;
  referralCode: string;
  hasSeenOnboarding: boolean;
  connectedAccounts: {
    youtube: boolean;
    tiktok: boolean;
    instagram: boolean;
  };
}

export interface WatermarkSettings {
  text: string;
  enabled: boolean;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  timestamp: number;
  quality?: 'SD' | 'HD';
  duration: number;
  model: 'standard' | 'pro';
}

export interface VideoConfig {
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  image?: string; // Base64 encoded image string for Image-to-Video
  duration: number;
  model?: 'standard' | 'pro';
}

export enum AppView {
  HOME = 'HOME',
  CREATE = 'CREATE',
  PROFILE = 'PROFILE',
  PREMIUM = 'PREMIUM',
  SETTINGS = 'SETTINGS',
  TERMS = 'TERMS',
  PRIVACY = 'PRIVACY'
}

// Augment window for AI Studio helpers and JSX for web components
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}