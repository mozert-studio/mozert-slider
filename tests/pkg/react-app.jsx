import React, { StrictMode, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import MozertSlider from '../../packages/react/index.mjs';

const box = (c) => ({ height: 80, background: c, color: '#fff' });
function App() {
  const [items, setItems] = useState([{ id: 'a', t: 'A' }, { id: 'b', t: 'B' }, { id: 'c', t: 'C' }, { id: 'd', t: 'D' }]);
  const [show, setShow] = useState(2);
  const [vis, setVis] = useState(true);
  const [log, setLog] = useState([]);
  const ref = useRef(null);
  window.api = { setItems, setShow, setVis, ref, log: () => log, items: () => items };
  window.inited = window.inited || [];
  return (
    <div>
      {vis && (
        <div id="host" style={{ width: 600 }}>
          <MozertSlider ref={ref} className="my-slider" id="s1" slidesToShow={show} arrows={false} dots={false}
            onInit={(s) => window.inited.push(s)} onChange={(i) => (window.changes = (window.changes || []).concat(i))}>
            {items.map((i, n) => <div key={i.id} style={box('#36c')} data-t={i.t}>{i.t}</div>)}
          </MozertSlider>
        </div>
      )}
    </div>
  );
}
window.mount = (strict) => { const el = document.getElementById('r'); window.root = createRoot(el); window.root.render(strict ? <StrictMode><App /></StrictMode> : <App />); };

function Gallery() {
  return (
    <div style={{ width: 500 }}>
      <MozertSlider id="g" thumbs lightbox arrows={false} dots={false}>
        {[0, 1, 2, 3].map((i) => <div key={i} data-caption={'cap ' + i}><img src={'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="hsl(' + i * 70 + ',70%,50%)"/></svg>')} alt={'img ' + i} /></div>)}
      </MozertSlider>
    </div>
  );
}
window.mountGallery = () => createRoot(document.getElementById('r2')).render(<Gallery />);
