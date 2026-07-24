const ExamTimer = ({ formatted, remaining, warningThreshold = 300 }) => {
  const isWarning = remaining <= warningThreshold && remaining > 0;
  const isCritical = remaining <= 60;

  return (
    <div
      style={{
        fontSize: '1.4rem',
        fontWeight: 700,
        fontFamily: 'monospace',
        color: isCritical ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--primary)',
        padding: '0.5rem 1rem',
        background: 'var(--bg)',
        borderRadius: 8,
      }}
    >
      {formatted}
    </div>
  );
};

export default ExamTimer;
