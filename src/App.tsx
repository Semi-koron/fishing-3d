import "./App.css";
import { Link } from "react-router-dom";

function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1 style={{ marginBottom: '40px', fontSize: '3em', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
        🎣 Fishing VR
      </h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Link 
          to="/game" 
          style={{
            padding: '15px 30px',
            backgroundColor: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            fontSize: '18px',
            textAlign: 'center',
            minWidth: '200px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          🎮 通常ゲーム
        </Link>
        
        <Link 
          to="/timeAttackGame" 
          style={{
            padding: '15px 30px',
            backgroundColor: '#dc3545',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            fontSize: '18px',
            textAlign: 'center',
            minWidth: '200px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          ⏱️ タイムアタック
        </Link>
        
        <Link 
          to="/test" 
          style={{
            padding: '15px 30px',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '10px',
            fontSize: '18px',
            textAlign: 'center',
            minWidth: '200px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          🧪 テスト
        </Link>
      </div>
      
      <div style={{ 
        marginTop: '40px', 
        textAlign: 'center', 
        opacity: 0.8,
        fontSize: '14px'
      }}>
        <p>JoyConを接続して釣りを楽しもう！</p>
        <p>🎯 タイムアタック: 60秒以内にできるだけ多くの魚を釣ろう</p>
      </div>
    </div>
  );
}

export default App;
