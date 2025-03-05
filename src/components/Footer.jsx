import React from 'react';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p>DialUp - Visual & Audio Data Transmission System</p>
        <p className="keyboard-shortcuts">
          <span className="shortcut-item">
            <kbd>Space</kbd> Start dictation
          </span>
          <span className="shortcut-item">
            <kbd>Esc</kbd> Cancel transmission
          </span>
        </p>
      </div>
      <div className="footer-credits">
        <p>&copy; {new Date().getFullYear()} DialUp Project</p>
      </div>
    </footer>
  );
};

export default Footer; 