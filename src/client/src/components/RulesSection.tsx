export default function RulesSection() {
  const rules = [
    { num: 1, text: <>Click Reserve to hold your pair for <strong>5 minutes</strong></> },
    { num: 2, text: <>Complete payment within 5 minutes or your hold expires</> },
    { num: 3, text: <>Maximum <strong>2 pairs per customer</strong>, 1 hold at a time</> },
    { num: 4, text: <>When sold out, join the waitlist — expired holds go to the next in line</> },
  ];

  return (
    <section className="rules-section">
      <h2 className="section-title">How It Works</h2>
      <div className="rules-list">
        {rules.map(({ num, text }) => (
          <div key={num} className="rule-item">
            <span className="rule-num">{num}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
