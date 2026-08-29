import React, { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

type WebFrame = {
  top: number;
  height: number;
};

function readVisualViewportFrame(): WebFrame {
  if (typeof window === 'undefined') {
    return { top: 0, height: 0 };
  }
  const vv = window.visualViewport;
  if (!vv) {
    return { top: 0, height: window.innerHeight };
  }
  return { top: vv.offsetTop, height: vv.height };
}

/** Layout-viewport pixels covered by the on-screen keyboard (web + iOS). Android uses adjustResize. */
function keyboardOverlapFromVisualViewport(
  innerHeight: number,
  viewportHeight: number,
  viewportOffsetTop: number
): number {
  return Math.max(0, innerHeight - viewportHeight - viewportOffsetTop);
}

function scrollFocusedFieldIntoView(): void {
  if (typeof document === 'undefined') return;
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return;
  if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable) {
    return;
  }
  el.scrollIntoView({ block: 'center', inline: 'nearest' });
}

function lockWebDocumentScroll(): () => void {
  const html = document.documentElement;
  const body = document.body;
  const prev = {
    htmlOverflow: html.style.overflow,
    htmlHeight: html.style.height,
    bodyOverflow: body.style.overflow,
    bodyHeight: body.style.height,
    bodyPosition: body.style.position,
    bodyWidth: body.style.width,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
  };
  html.style.overflow = 'hidden';
  html.style.height = '100%';
  body.style.overflow = 'hidden';
  body.style.height = '100%';
  body.style.position = 'fixed';
  body.style.width = '100%';
  body.style.top = '0';
  body.style.left = '0';
  return () => {
    html.style.overflow = prev.htmlOverflow;
    html.style.height = prev.htmlHeight;
    body.style.overflow = prev.bodyOverflow;
    body.style.height = prev.bodyHeight;
    body.style.position = prev.bodyPosition;
    body.style.width = prev.bodyWidth;
    body.style.top = prev.bodyTop;
    body.style.left = prev.bodyLeft;
  };
}

function animateIosKeyboard(duration: number): void {
  LayoutAnimation.configureNext({
    duration: duration > 0 ? duration : 250,
    update: { type: LayoutAnimation.Types.keyboard },
  });
}

/**
 * Keyboard height that covers the bottom of the window. Use on Modal overlays —
 * they portal outside {@link KeyboardSafeView} so they need their own inset.
 */
export function useKeyboardBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      const update = () => {
        const vv = window.visualViewport;
        if (!vv) {
          setInset(0);
          return;
        }
        setInset(keyboardOverlapFromVisualViewport(window.innerHeight, vv.height, vv.offsetTop));
      };
      update();
      window.visualViewport?.addEventListener('resize', update);
      window.visualViewport?.addEventListener('scroll', update);
      window.addEventListener('resize', update);
      return () => {
        window.visualViewport?.removeEventListener('resize', update);
        window.visualViewport?.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
      };
    }

    if (Platform.OS !== 'ios') return;

    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      setInset(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => {
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}

/**
 * Keeps the app in the visible viewport when the phone keyboard opens.
 * iOS Safari / Chrome (Expo web) ignore KeyboardAvoidingView; this sizes to visualViewport instead.
 * Native iOS pads by keyboard height so tab-bar composers stay on screen. Android resizes the window.
 */
export function KeyboardSafeView({ children, style }: Props) {
  const [webFrame, setWebFrame] = useState<WebFrame | null>(() =>
    Platform.OS === 'web' ? readVisualViewportFrame() : null
  );
  const [iosInset, setIosInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      const unlock = lockWebDocumentScroll();
      const update = () => {
        setWebFrame(readVisualViewportFrame());
        requestAnimationFrame(scrollFocusedFieldIntoView);
      };
      update();
      window.visualViewport?.addEventListener('resize', update);
      window.visualViewport?.addEventListener('scroll', update);
      window.addEventListener('resize', update);
      window.addEventListener('focusin', update);
      return () => {
        unlock();
        window.visualViewport?.removeEventListener('resize', update);
        window.visualViewport?.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
        window.removeEventListener('focusin', update);
      };
    }

    if (Platform.OS !== 'ios') return;

    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      animateIosKeyboard(e.duration);
      setIosInset(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      animateIosKeyboard(e.duration);
      setIosInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS === 'web' && webFrame && webFrame.height > 0) {
    return (
      <View style={styles.fill}>
        <View style={[styles.webFrame, { top: webFrame.top, height: webFrame.height }, style]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fill, iosInset > 0 ? { paddingBottom: iosInset } : null, style]}>
      {children}
    </View>
  );
}

/** Bottom-sheet / centered modal overlay that lifts with the keyboard. */
export function KeyboardAvoidingOverlay({ children, style }: Props) {
  const inset = useKeyboardBottomInset();
  return <View style={[style, inset > 0 ? { paddingBottom: inset } : null]}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  webFrame: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});
