interface HeaderProps {
  userId: string;
}

export default function Header({ userId }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <span className="brand-name">SneakDrop</span>
        </div>
        <div className="user-badge">
          <span className="user-dot" />
          <span className="user-id">{userId}</span>
        </div>
      </div>
    </header>
  );
}
