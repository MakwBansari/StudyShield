import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.landingPage}>
      <nav className={styles.landingNav}>
        <div className="logo">StudyShield<span>.</span></div>
        <div className={styles.navLinks}>
          <Link href="/login" className={styles.navLink}>Login</Link>
          <Link href="/signup" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      <header className={styles.landingHero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>Engineered for GATE CS Aspirants</div>
          <h1>Conquer GATE CS with <span>Unbreakable Focus.</span></h1>
          <p className={styles.quote}>"Discipline is the bridge between goals and accomplishment."</p>
          <p className={styles.heroDesc}>
            The only study environment that blocks your distractions, tracks your syllabus progress, and uses precision data to optimize your revision cycles.
          </p>
          <div className={styles.heroActions}>
            <Link href="/signup" className="btn btn-primary btn-hero">Start Studying for Free</Link>
            <Link href="#features" className="btn btn-secondary btn-hero">Explore Features</Link>
          </div>
        </div>
        <div className={styles.heroGlow}></div>
      </header>

      <section id="features" className={styles.landingFeatures}>
        <div className={styles.sectionHeader}>
          <h2>The Study Environment for <span>Toppers.</span></h2>
          <p>Everything you need to stay focused and track your progress in one place.</p>
        </div>
        
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3>Ironclad Blocking</h3>
            <p>Our Chrome extension stops you from visiting distracting sites the moment your focus timer starts.</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🧠</div>
            <h3>Spaced Repetition</h3>
            <p>Automatically tracks topics and alerts you to revise based on scientific forgetting curves.</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Weightage Heatmap</h3>
            <p>Visualize your study distribution vs. actual GATE weightage to ensure you're prioritizing high-mark subjects.</p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎯</div>
            <h3>Daily Focus Score</h3>
            <p>Get a daily grade based on your study hours, consistency streaks, and distraction resistance.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚙️</div>
            <h3>Pomodoro Customization</h3>
            <p>Set custom focus and break intervals that work for your attention span, with precise audio alerts.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>✅</div>
            <h3>Subject Mastery</h3>
            <p>Track exactly how many questions you've solved per subject and mark them complete as you hit your targets.</p>
          </div>
        </div>
      </section>

      <section className={styles.landingQuoteBreak}>
        <div className="container">
          <p>"The successful warrior is the average man, with laser-like focus."</p>
          <span>— Bruce Lee</span>
        </div>
      </section>

      <footer className={styles.landingFooter}>
        <div className={styles.footerContent}>
          <div className="logo">StudyShield<span>.</span></div>
          <p>© 2026 StudyShield. Built for the next generation of GATE Rankers.</p>
        </div>
      </footer>
    </div>
  );
}
