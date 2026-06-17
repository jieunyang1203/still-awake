// DeepFocus.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FilmGrain from './components/FilmGrain';
import sunSvg from './assets/sun.svg';
import moonSvg from './assets/moon.svg';
import './DeepFocus.css';

const pomodoroSettings = { workTime: 25, breakTime: 5, longBreakTime: 15 };

function DeepFocus() {
  const navigate = useNavigate();
  const [onlineUsers, setOnlineUsers] = useState(Math.floor(Math.random() * 50) + 10);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [activeTab, setActiveTab] = useState('timer');

  // Pomodoro Timer
  const [timerTime, setTimerTime] = useState({ minutes: 25, seconds: 0 });
  const timerMinutes = timerTime.minutes;
  const timerSeconds = timerTime.seconds;
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [totalTimeInSeconds, setTotalTimeInSeconds] = useState(25 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Breathing Exercise
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState('inhale');
  const [breathCount, setBreathCount] = useState(4);
  const breathIntervalRef = useRef();
  const breathCountRef = useRef();

  // Session Goals
  const [sessionGoal, setSessionGoal] = useState('');
  const [previousGoals, setPreviousGoals] = useState([
    { text: 'Complete project proposal', completed: true, date: 'Today, 2:00 PM' },
    { text: 'Review chapter 3', completed: true, date: 'Today, 10:00 AM' },
    { text: 'Write 500 words', completed: false, date: 'Yesterday' },
  ]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  // Timer tick — interval only created/destroyed when isTimerRunning changes
  useEffect(() => {
    if (!isTimerRunning) return;
    const id = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
      setTimerTime(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { minutes: prev.minutes - 1, seconds: 59 };
        return prev; // 0:00 reached — completion effect handles transition
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isTimerRunning]);

  // Timer completion — fires only when timer hits 0:00 while running
  useEffect(() => {
    if (!isTimerRunning || timerMinutes !== 0 || timerSeconds !== 0) return;
    if (!isBreakTime) {
      const newSessions = sessionsCompleted + 1;
      const breakTime = newSessions % 4 === 0 ? pomodoroSettings.longBreakTime : pomodoroSettings.breakTime;
      setSessionsCompleted(newSessions);
      setTimerTime({ minutes: breakTime, seconds: 0 });
      setTotalTimeInSeconds(breakTime * 60);
      setElapsedSeconds(0);
      setIsBreakTime(true);
    } else {
      setTimerTime({ minutes: pomodoroSettings.workTime, seconds: 0 });
      setTotalTimeInSeconds(pomodoroSettings.workTime * 60);
      setElapsedSeconds(0);
      setIsBreakTime(false);
    }
  }, [isTimerRunning, timerMinutes, timerSeconds, isBreakTime, sessionsCompleted, pomodoroSettings]);

  // Breathing Exercise
  useEffect(() => {
    if (!isBreathing) return;
    const sequence = [
      { phase: 'inhale', duration: 4000, count: 4 },
      { phase: 'hold',   duration: 7000, count: 7 },
      { phase: 'exhale', duration: 8000, count: 8 },
    ];
    let currentIndex = 0;

    const runBreathingCycle = () => {
      const current = sequence[currentIndex];
      setBreathPhase(current.phase);
      setBreathCount(current.count);
      let countdown = current.count;
      breathCountRef.current = setInterval(() => {
        countdown--;
        if (countdown >= 0) setBreathCount(countdown);
      }, current.duration / current.count);

      breathIntervalRef.current = setTimeout(() => {
        clearInterval(breathCountRef.current);
        currentIndex = (currentIndex + 1) % sequence.length;
        runBreathingCycle();
      }, current.duration);
    };

    runBreathingCycle();

    return () => {
      clearTimeout(breathIntervalRef.current);
      clearInterval(breathCountRef.current);
    };
  }, [isBreathing]);

  // Online count simulation
  useEffect(() => {
    const id = setInterval(() => {
      setOnlineUsers(prev => Math.max(1, Math.min(99, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (minutes, seconds) =>
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerTime({ minutes: pomodoroSettings.workTime, seconds: 0 });
    setTotalTimeInSeconds(pomodoroSettings.workTime * 60);
    setElapsedSeconds(0);
    setIsBreakTime(false);
  };

  return (
    <div className={`deep-focus-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <FilmGrain intensityScale={0.5} />
      <div className="focus-container">
        <div className="top-header">
          <h1 className="page-title">Deep Focus</h1>
          <p className="online-count">Currently Online({onlineUsers})</p>
        </div>

        <div className="main-content-fullscreen">
          {activeTab === 'timer' && (
            <div className="timer-fullscreen" onClick={() => setIsTimerRunning(!isTimerRunning)}>
              <div className="timer-circle-dots">
                {[...Array(30)].map((_, i) => {
                  const progress = elapsedSeconds / totalTimeInSeconds;
                  const isFilled = (i / 30) < progress;
                  return (
                    <div
                      key={i}
                      className={`timer-dot ${isFilled ? 'filled' : ''}`}
                      style={{ transform: `rotate(${i * 12}deg) translateY(-180px)` }}
                    />
                  );
                })}
              </div>
              <span className="timer-time-large">{formatTime(timerMinutes, timerSeconds)}</span>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="goals-fullscreen">
              <div className="goals-container">
                <div className="add-goal-wrapper">
                  <input
                    type="text"
                    className="add-goal-input"
                    placeholder="Add a new goal..."
                    value={sessionGoal}
                    onChange={(e) => setSessionGoal(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && sessionGoal.trim()) {
                        setPreviousGoals(prev => [
                          { text: sessionGoal, completed: false, date: 'Just now' },
                          ...prev,
                        ]);
                        setSessionGoal('');
                      }
                    }}
                  />
                </div>
                <div className="goals-list">
                  {previousGoals.map((goal, index) => (
                    <div key={index} className={`goal-item ${goal.completed ? 'completed' : ''}`}>
                      <div
                        className={`goal-checkbox-circle ${goal.completed ? 'checked' : ''}`}
                        onClick={() => setPreviousGoals(prev =>
                          prev.map((g, i) => i === index ? { ...g, completed: !g.completed } : g)
                        )}
                      />
                      <span className="goal-content">{goal.text}</span>
                    </div>
                  ))}
                  {[...Array(Math.max(0, 10 - previousGoals.length))].map((_, i) => (
                    <div key={`empty-${i}`} className="goal-item empty" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'breathe' && (
            <div className="breathe-fullscreen">
              <div className="breathe-content">
                <div
                  className={`breathing-circle-new ${isBreathing ? breathPhase : ''}`}
                  onClick={() => setIsBreathing(!isBreathing)}
                >
                  {isBreathing
                    ? <span key={breathCount} className="breath-count-new">{breathCount}</span>
                    : <span className="breathing-start-new">click to start</span>
                  }
                </div>
                {isBreathing && (
                  <div className="breath-phase-side">
                    {breathPhase === 'inhale' && 'Inhale...'}
                    {breathPhase === 'hold' && 'hold'}
                    {breathPhase === 'exhale' && 'Exhale...'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bottom-nav">
          <button className={`nav-tab ${activeTab === 'timer' ? 'active' : ''}`} onClick={() => setActiveTab('timer')}>( Timer )</button>
          <button className={`nav-tab ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>( Goals )</button>
          <button className={`nav-tab ${activeTab === 'breathe' ? 'active' : ''}`} onClick={() => setActiveTab('breathe')}>( Breathe )</button>
        </div>

        <div className="mode-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
          <img src={isDarkMode ? sunSvg : moonSvg} width="30" height="30" alt="" style={{ display: 'block' }} />
        </div>

        <div className="home-btn" onClick={() => navigate('/home')}>back</div>
      </div>
    </div>
  );
}

export default DeepFocus;
