import React from 'react';
import { Plus, MessageSquare, Trash2, Edit3, PanelLeftClose } from 'lucide-react';
import { ChatSession } from '../types/chat';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onToggleSidebar?: () => void;
  onNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
  onRenameChat: (sessionId: string, newTitle: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function ChatSidebar({
  sessions,
  currentSessionId,
  onToggleSidebar,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  isMobileOpen,
  onCloseMobile
}: ChatSidebarProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');

  const handleRename = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (sessionId: string) => {
    if (editTitle.trim()) {
      onRenameChat(sessionId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-gradient-to-b from-gray-900 to-gray-800 text-white
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-full
        shadow-2xl lg:shadow-none
      `}>
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-700/50">
          <div className="flex gap-2">
            <button
              onClick={onNewChat}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                       transition-all duration-200 text-white px-4 py-3 rounded-xl flex items-center gap-3 font-medium
                       shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={20} />
              New Chat
            </button>
            
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="bg-gray-700/50 hover:bg-gray-600/50 transition-all duration-200 text-white 
                         px-3 py-3 rounded-xl flex items-center justify-center
                         shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                aria-label="Hide sidebar"
              >
                <PanelLeftClose size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
            <div className="p-4">
              {sessions.length === 0 ? (
                <div className="text-gray-400 text-center py-12">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={32} className="opacity-50" />
                  </div>
                  <p className="font-medium mb-2">No conversations yet</p>
                  <p className="text-sm opacity-75">Start chatting to see your history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                    .map((session) => (
                      <div
                        key={session.id}
                        className={`
                          p-3 rounded-xl cursor-pointer transition-all duration-200 group
                          ${currentSessionId === session.id 
                            ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 shadow-md ring-1 ring-blue-500/20' 
                            : 'hover:bg-gray-800/50 hover:shadow-md hover:ring-1 hover:ring-gray-600/20'
                          }
                          relative overflow-hidden
                        `}
                        onClick={() => onSelectChat(session.id)}
                      >
                        {/* Active indicator */}
                        {currentSessionId === session.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r" />
                        )}
                        
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 pl-2">
                            {editingId === session.id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleSaveRename(session.id)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveRename(session.id);
                                  }
                                }}
                                className="w-full bg-gray-800 text-white px-2 py-1 rounded-md text-sm border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <h3 className="font-medium truncate text-sm mb-1 leading-snug">
                                {session.title || 'New Chat'}
                              </h3>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{formatDate(session.updatedAt)}</span>
                              <div className="w-1 h-1 bg-gray-500 rounded-full" />
                              <span>{session.messages.length} messages</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(session);
                              }}
                              className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
                              title="Rename chat"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChat(session.id);
                              }}
                              className="p-1.5 hover:bg-red-600 rounded-md transition-colors"
                              title="Delete chat"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-gray-700/50">
          <div className="text-xs text-gray-400 text-center space-y-1">
            <div className="font-medium">Xylem agent Interface</div>
            <div className="opacity-75">Powered by Advanced AI</div>
          </div>
        </div>
      </div>
    </>
  );
}
