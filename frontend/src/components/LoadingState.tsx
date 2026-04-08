import React, { useEffect, useState } from 'react';

type LoadingStateProps = {
  className?: string;
  compact?: boolean;
  description?: string;
  slowMessage?: string;
  title: string;
};

export const useSlowLoading = (active: boolean, delay = 5000) => {
  const [showSlowState, setShowSlowState] = useState(false);

  useEffect(() => {
    if (!active) {
      setShowSlowState(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSlowState(true);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active, delay]);

  return showSlowState;
};

export const HexLoader: React.FC<{ className?: string }> = React.memo(({ className = '' }) => (
  <div aria-hidden="true" className={`loader ${className}`.trim()} />
));

export const LoadingState: React.FC<LoadingStateProps> = React.memo(({
  className = '',
  compact = false,
  description = 'Hệ thống đang chuẩn bị dữ liệu để hiển thị cho bạn.',
  slowMessage = 'Đang tải dữ liệu...',
  title,
}) => {
  const showSlowState = useSlowLoading(true);

  return (
    <div className={`dashboard-loading-state ${compact ? 'dashboard-loading-state--compact' : ''} ${className}`.trim()}>
      <HexLoader className={compact ? 'dashboard-loading-state__loader--compact' : ''} />
      <div className="space-y-2">
        <p className="dashboard-loading-state__title">{title}</p>
        <p className="dashboard-loading-state__description">{description}</p>
        {showSlowState ? <p className="dashboard-loading-state__slow">{slowMessage}</p> : null}
      </div>
    </div>
  );
});

export default LoadingState;
