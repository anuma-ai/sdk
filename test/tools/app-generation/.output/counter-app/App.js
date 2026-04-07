import React, { useState } from 'react';
import './App.css';

export default function App() {
  const [count, setCount] = useState(0);

  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(0);

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Counter</h1>
        <div className="count">{count}</div>
        <div className="button-group">
          <button onClick={decrement} className="btn btn-decrement" aria-label="Decrement">
            −
          </button>
          <button onClick={reset} className="btn btn-reset" aria-label="Reset">
            Reset
          </button>
          <button onClick={increment} className="btn btn-increment" aria-label="Increment">
            +
          </button>
        </div>
      </div>
    </div>
  );
}