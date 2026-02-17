import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useTheme } from '@my-apps/contexts';
import { ModalWrapper, ModalHeader } from '@my-apps/ui';

/**
 * YouTubeVideoModal - Modal for playing YouTube videos
 *
 * Props:
 * - visible: boolean - Whether modal is visible
 * - onClose: function - Called when modal should close
 * - youTubeUrl: string - YouTube video URL
 * - exerciseName: string - Name of exercise (for modal title)
 */
const YouTubeVideoModal = ({ visible, onClose, youTubeUrl, exerciseName }) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();
  const [ready, setReady] = useState(false);

  // Extract video ID from various YouTube URL formats
  const getVideoId = (url) => {
    if (!url) return null;

    // Handle different YouTube URL formats:
    // - https://www.youtube.com/watch?v=VIDEO_ID
    // - https://youtu.be/VIDEO_ID
    // - https://www.youtube.com/embed/VIDEO_ID
    // - https://m.youtube.com/watch?v=VIDEO_ID

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const videoId = getVideoId(youTubeUrl);
  const screenWidth = Dimensions.get('window').width;
  const videoHeight = (screenWidth * 9) / 16; // 16:9 aspect ratio

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    contentContainer: {
      flex: 1,
      marginTop: 40,
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      overflow: 'hidden',
    },
    videoContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (!visible) return null;

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.contentContainer}>
          <ModalHeader
            title={exerciseName || 'Exercise Video'}
            onCancel={onClose}
            cancelText="Close"
            showDone={false}
          />

          <View style={styles.videoContainer}>
            {!ready && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}

            {videoId ? (
              <YoutubePlayer
                height={videoHeight}
                width={screenWidth}
                videoId={videoId}
                onReady={() => setReady(true)}
                webViewProps={{
                  androidLayerType: 'hardware',
                }}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.error} />
              </View>
            )}
          </View>
        </View>
      </View>
    </ModalWrapper>
  );
};

export default YouTubeVideoModal;
