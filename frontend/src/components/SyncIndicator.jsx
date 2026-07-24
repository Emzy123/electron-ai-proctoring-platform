const STATUS_CONFIG = {
  online: { label: 'Online', class: 'badge-success' },
  offline: { label: 'Offline — saving locally', class: 'badge-danger' },
  syncing: { label: 'Syncing...', class: 'badge-warning' },
};

const SyncIndicator = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.online;
  return (
    <span className={`badge ${config.class}`} title="Connection sync status">
      {config.label}
    </span>
  );
};

export default SyncIndicator;
