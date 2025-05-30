import React from 'react';

const ConversationLog = ({ logs }) => {
  return (
    <div className="conversation-log mt-4">
      <h2 className="text-lg font-semibold">Logs:</h2>
      {logs.length === 0 ? (
        <p className="text-gray-500 italic">No conversation logs yet.</p>
      ) : (
        <ul className="max-h-60 overflow-y-auto">
          {logs.map((log, index) => (
            <li key={index} className="log-entry mb-2 p-2 border border-gray-200 rounded">
              <p className="text-sm text-gray-500">{log.timestamp}</p>
              <p>{log.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConversationLog; 