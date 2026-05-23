import React from 'react';

export default function Container({ children, style, className, ...props }) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: '980px',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: '16px',
        paddingRight: '16px',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
