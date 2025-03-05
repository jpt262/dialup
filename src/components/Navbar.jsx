import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { createAnimationController } from '../core/animations/colorSequence';

const Navbar = () => {
  const transmissionBarRef = useRef(null);
  const { 
    isTransmitting,
    colorSequence,
    currentIndex,
    frameDuration 
  } = useSelector(state => state.transmission);
  
  const { isListening } = useSelector(state => state.speech);
  const animatorRef = useRef(null);

  // Initialize animator when component mounts
  useEffect(() => {
    if (transmissionBarRef.current) {
      animatorRef.current = createAnimationController(transmissionBarRef.current);
    }
    
    return () => {
      if (animatorRef.current) {
        animatorRef.current.stop();
      }
    };
  }, []);

  // Handle transmission changes
  useEffect(() => {
    if (isTransmitting && colorSequence.length > 0 && animatorRef.current) {
      animatorRef.current
        .setSequence(colorSequence)
        .setFrameDuration(frameDuration)
        .start();
    } else if (!isTransmitting && animatorRef.current) {
      animatorRef.current.stop();
    }
  }, [isTransmitting, colorSequence, frameDuration]);

  return (
    <header>
      <nav className="navbar">
        <div className="navbar-brand">
          DialUp
          {isListening && (
            <span className="listening-indicator">
              🎤 Listening...
            </span>
          )}
        </div>
        <div 
          id="transmissionBar" 
          className="transmission-bar"
          ref={transmissionBarRef}
        ></div>
      </nav>
    </header>
  );
};

export default Navbar; 