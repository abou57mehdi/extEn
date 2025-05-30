import React from 'react';

const DownloadButton = ({ summary, disabled }) => {
  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation_summary_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      className={`download-btn mt-4 px-4 py-2 rounded transition duration-150 ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
      onClick={handleDownload}
      disabled={disabled}
    >
      Download Summary
    </button>
  );
};

export default DownloadButton; 