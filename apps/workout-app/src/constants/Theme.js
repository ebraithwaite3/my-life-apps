const Theme = {
    light: {
      // Backgrounds
      background: '#FFFFFF',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      header: '#F3F4F6',
      
      // Text Colors
      text: {
        primary: '#1F2937',
        secondary: '#6B7280',
        tertiary: '#9CA3AF',
        inverse: '#FFFFFF'
      },
      
      // Primary/Accent Colors
      primary: '#3B82F6',
      primaryLight: '#EFF6FF',
      primaryDark: '#1D4ED8',
      
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
        secondaryText: '#1F2937',
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
      }
    },
    
    dark: {
      // Backgrounds
      background: '#000000',
      surface: '#000000',
      card: '#111827',
      header: '#1F2937',
      
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
      error: '#F87171',
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
      divider: '#1F2937',
      
      // Shadows
      shadow: {
        color: '#60A5FA',
        opacity: 0.2,
        offset: { width: 0, height: 0 },
        radius: 8,
        elevation: 0
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