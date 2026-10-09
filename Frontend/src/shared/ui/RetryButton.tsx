interface RetryButtonProps {
  onClick: () => void;
}

export function RetryButton({ onClick }: RetryButtonProps) {
  return <button type="button" className="retry-button" onClick={onClick}>Tentar novamente</button>;
}
