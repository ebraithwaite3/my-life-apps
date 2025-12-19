const Theme = {
  light: {
    // ... (Your original light theme remains untouched as requested)
    // Backgrounds
    background: '#FFFFFF',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    header: '#F3F4F6',
    
    // Text Colors
    text: {
      primary: '#161e29',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF'
    },
    
    // Primary/Accent Colors
    primary: '#3B82F6',
    primaryLight: '#EFF6FF',
    primaryDark: '#1D4ED8',
    primarySoft: '#D9E9FF',

    // Calendar Specific
    calendar: {
      gridBorder: '#E5E7EB',
      todayBackground: '#EFF6FF',
      todayText: '#3B82F6',
      selectedBackground: '#3B82F6',
      selectedText: '#FFFFFF',
      weekendText: '#6B7280',
      otherMonthText: '#D1D5DB'
    },
    
    // Event Colors
    events: {
      green: '#10B981',
      orange: '#F59E0B',
      purple: '#8B5CF6',
      red: '#EF4444',
      blue: '#3B82F6',
      pink: '#EC4899',
      yellow: '#EAB308',
      indigo: '#6366F1'
    },
    
    // UI States
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    // Interactive Elements
    button: {
      primary: '#3B82F6',
      primaryText: '#FFFFFF',
      secondary: '#F3F4F6',
      secondaryText: '#161e29',
      disabled: '#D1D5DB',
      disabledText: '#9CA3AF'
    },
    
    // Borders and Dividers
    border: '#E5E7EB',
    divider: '#F3F4F6',
    
    // Shadows
    shadow: {
      color: '#000000',
      opacity: 0.1,
      offset: { width: 0, height: 2 },
      radius: 8,
      elevation: 3
    },

    // Modal specific styles
    modal: {
      headerBackground: '#F3F4F6',
      border: '#F3F4F6',
      overlay: 'rgba(0, 0, 0, 0.5)',
    }
  },
  
  dark: {
    // ... (Your original high-contrast dark theme remains)
    // Backgrounds
    background: '#000000',
    surface: '#000000',
    card: '#111827',
    header: '#161e29',
    
    // Text Colors
    text: {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
      tertiary: '#9CA3AF',
      inverse: '#000000'
    },
    
    // Primary/Accent Colors
    primary: '#60A5FA',
    primaryLight: '#1E3A8A',
    primaryDark: '#93C5FD',
    primarySoft: '#1E3A8A',

    // Calendar Specific
    calendar: {
      gridBorder: '#374151',
      todayBackground: '#1E3A8A',
      todayText: '#93C5FD',
      selectedBackground: '#60A5FA',
      selectedText: '#000000',
      weekendText: '#9CA3AF',
      otherMonthText: '#4B5563'
    },
    
    // Event Colors
    events: {
      green: '#34D399',
      orange: '#FBBF24',
      purple: '#A78BFA',
      red: '#F87171',
      blue: '#60A5FA',
      pink: '#F472B6',
      yellow: '#FDE047',
      indigo: '#818CF8'
    },
    
    // UI States
    success: '#34D399',
    warning: '#FBBF24',
    error: '#CC293C',
    info: '#60A5FA',
    
    // Interactive Elements
    button: {
      primary: '#60A5FA',
      primaryText: '#000000',
      secondary: '#374151',
      secondaryText: '#F9FAFB',
      disabled: '#4B5563',
      disabledText: '#6B7280'
    },
    
    // Borders and Dividers
    border: '#374151',
    divider: '#161e29',
    
    // Shadows
    shadow: {
      color: '#60A5FA',
      opacity: 0.2,
      offset: { width: 0, height: 0 },
      radius: 8,
      elevation: 0
    },

    // Modal specific styles
    modal: {
      headerBackground: '#161e29',
      border: '#161e29',
      overlay: 'rgba(0, 0, 0, 0.7)',
    }
  },

  darkSoft: {
    // --- BACKGROUNDS: Deep Charcoal / Soft Navy ---
    background: '#121212', // Purest background (soft black)
    surface: '#1E1E1E',    // Primary card/surface color
    card: '#292929',       // Slightly lighter for nested elements
    header: '#1E1E1E',     // Header/Toolbar background
    
    // --- TEXT COLORS: Off-White/Light Gray for reduced glare ---
    text: {
      primary: '#E0E0E0',   // Soft white
      secondary: '#BDBDBD', // Lighter gray for secondary text
      tertiary: '#858585',  // Medium gray for tertiary text/placeholders
      inverse: '#121212'    // Very dark for text on bright colors
    },
    
    // --- PRIMARY/ACCENT COLORS: Muted/Softer Blue ---
    primary: '#8AB4F8',     // Softer primary blue
    primaryLight: '#2C3E50',// Darker background tint
    primaryDark: '#5D9CEC', // Slightly brighter when needed
    primarySoft: '#2C3E50', // Soft background for primary elements

    // --- CALENDAR SPECIFIC ---
    calendar: {
      gridBorder: '#333333',         // Subtler grid lines
      todayBackground: '#2C3E50',    // Soft dark background for today
      todayText: '#8AB4F8',          // Soft primary text for today
      selectedBackground: '#8AB4F8', // Soft primary blue for selection
      selectedText: '#121212',       // Dark text on selection
      weekendText: '#BDBDBD',
      otherMonthText: '#666666'
    },
    
    // --- EVENT COLORS: Less saturated/vibrant versions of originals ---
    events: {
      green: '#69F0AE',
      orange: '#FFC107',
      purple: '#B39DDB',
      red: '#EF9A9A',
      blue: '#8AB4F8',
      pink: '#F48FB1',
      yellow: '#FFEB3B',
      indigo: '#9FA8DA'
    },
    
    // --- UI STATES ---
    success: '#69F0AE',
    warning: '#FFC107',
    error: '#CC293C',
    info: '#8AB4F8',
    
    // --- INTERACTIVE ELEMENTS ---
    button: {
      primary: '#8AB4F8',
      primaryText: '#121212',
      secondary: '#292929',
      secondaryText: '#E0E0E0',
      disabled: '#424242',
      disabledText: '#858585'
    },
    
    // --- BORDERS and DIVIDERS: Very subtle ---
    border: '#333333',
    divider: '#1E1E1E',
    
    // --- SHADOWS: Subtle and minimal on dark theme ---
    shadow: {
      color: '#000000',
      opacity: 0.4,
      offset: { width: 0, height: 4 },
      radius: 10,
      elevation: 5
    },

    // Modal specific styles
    modal: {
      headerBackground: '#1E1E1E',
      border: '#1E1E1E',
      overlay: 'rgba(0, 0, 0, 0.8)', // Slightly darker overlay to focus
    }
  },
  
  // Spacing system
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  
  // Typography
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    h3: { fontSize: 20, fontWeight: '600' },
    h4: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: 'normal' },
    bodySmall: { fontSize: 14, fontWeight: 'normal' },
    caption: { fontSize: 12, fontWeight: 'normal' },
    button: { fontSize: 16, fontWeight: '600' }
  },
  
  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999
  }
};

export default Theme;