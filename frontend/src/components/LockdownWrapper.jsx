import { useLockdown } from '../hooks/useLockdown';

const LockdownWrapper = ({ children, onViolation, enabled = true }) => {
  useLockdown(onViolation, enabled);

  return (
    <div
      style={{ minHeight: '100vh', userSelect: 'none' }}
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
};

export default LockdownWrapper;
