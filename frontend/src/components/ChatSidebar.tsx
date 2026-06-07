import React from 'react';
import { Edit3, MessageSquare, PanelLeftClose, Plus, Trash2 } from 'lucide-react';
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
  onCloseMobile,
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

    if (diffInDays === 0) return '今天';
    if (diffInDays === 1) return '昨天';
    if (diffInDays < 7) return `${diffInDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-full w-80 flex-col border-r border-white/12
          bg-[#091821]/58 text-white shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:shadow-none
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex-shrink-0 border-b border-white/10 p-5">
          <div className="ether-micro ether-label mb-4">ROOMS</div>
          <div className="flex gap-2">
            <button
              onClick={onNewChat}
              className="ether-button flex flex-1 items-center justify-center gap-3 px-4 py-3"
            >
              <Plus size={18} />
              新对话
            </button>

            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="ether-button flex px-3 py-3"
                aria-label="隐藏侧边栏"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="ether-scroll flex-1 overflow-y-auto">
            <div className="p-4">
              {sessions.length === 0 ? (
                <div className="py-12 text-center text-white/54">
                  <div className="ether-panel mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                    <MessageSquare size={30} className="opacity-60" />
                  </div>
                  <p className="ether-micro mb-2 text-white/72">NO SIGNAL</p>
                  <p className="text-xs leading-6 text-white/48">聊天后显示历史频道</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                    .map((session, index) => {
                      const active = currentSessionId === session.id;

                      return (
                        <div
                          key={session.id}
                          className={`
                            group relative cursor-pointer overflow-hidden border px-3 py-3 transition-all duration-200
                            ${active
                              ? 'border-orange-100/40 bg-white/12 shadow-[0_0_30px_rgb(255_190_130_/_0.12)]'
                              : 'border-white/8 bg-white/4 hover:border-white/20 hover:bg-white/8'}
                          `}
                          onClick={() => onSelectChat(session.id)}
                        >
                          {active && (
                            <div className="absolute left-0 top-0 h-full w-1 bg-orange-200/70" />
                          )}

                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 pl-2">
                              <div className="ether-micro ether-faint mb-1">
                                CH. {String(index + 1).padStart(2, '0')}
                              </div>
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
                                  className="ether-field w-full px-2 py-1 text-sm"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <h3 className="truncate text-sm font-medium leading-snug text-white/88">
                                  {session.title || '新对话'}
                                </h3>
                              )}
                              <div className="mt-2 flex items-center gap-2 text-xs text-white/48">
                                <span>{formatDate(session.updatedAt)}</span>
                                <span className="h-1 w-1 rounded-full bg-white/30" />
                                <span>{session.messages.length} 条消息</span>
                              </div>
                            </div>

                            <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRename(session);
                                }}
                                className="p-1.5 text-white/58 transition-colors hover:text-white"
                                title="重命名对话"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteChat(session.id);
                                }}
                                className="p-1.5 text-white/58 transition-colors hover:text-red-200"
                                title="删除对话"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-white/10 p-5">
          <div className="ether-micro ether-label space-y-1">
            <div>XYLEM AGENT INTERFACE</div>
            <div>AI DRIVEN / ANALOG SIGNAL</div>
          </div>
        </div>
      </aside>
    </>
  );
}
