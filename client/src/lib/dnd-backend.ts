import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend } from 'react-dnd-multi-backend';

const HTML5toTouch = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: {
        type: 'mousedown',
      },
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: {
        enableMouseEvents: true,
        enableTouchEvents: true,
        delay: 100,
        delayTouchStart: 100,
      },
      preview: true,
      transition: {
        type: 'touchstart',
      },
    },
  ],
};

export { MultiBackend, HTML5toTouch };