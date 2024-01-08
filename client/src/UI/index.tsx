// MyComponent.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';

let pickups: {[itemId: number | string]: number} = {};

const MyComponent: React.FC<{}> = () => {
  return (
    <div>
      Hello world!
    </div>
  )
};

const root = createRoot(document.getElementById('root')!);


let startUI = () => {
  root.render(
    <React.StrictMode>
      <MyComponent />
    </React.StrictMode>
  )
};


export {startUI};
