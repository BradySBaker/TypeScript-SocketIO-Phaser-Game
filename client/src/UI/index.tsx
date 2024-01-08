import React, {useState} from 'react';
import { createRoot } from 'react-dom/client';

import DisplayPickup from './DisplayPickup.jsx';
import ToolSelector from './ToolSelector.jsx';

let externalSetPickup!: Function;

const UI: React.FC<{}> = () => {
  const [newPickup, setNewPickup] = useState({count: 0, type: 0});
  externalSetPickup = setNewPickup;

  return (
    <div id="app">
      <DisplayPickup newPickup={newPickup}/>
      <ToolSelector />
    </div>
  )
};

const root = createRoot(document.getElementById('root')!);


let startUI = () => {
  root.render(
    <React.StrictMode>
      <UI />
    </React.StrictMode>
  )
};


export {startUI, externalSetPickup};
