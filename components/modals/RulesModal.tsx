"use client";

import React from "react";

interface RulesModalProps {
  mode: "solo" | "multiplayer";
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ mode, isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  if (mode === "solo") {
    return (
      <div className="fixed inset-0 z-[95] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <i className="fas fa-book-open text-white text-lg"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">กติกาโหมด Solo</h2>
                <p className="text-slate-400 text-sm">โหมดเล่นคนเดียว - หาคำระเบิดให้เจอ</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-200 flex items-center justify-center border border-slate-600/50 hover:border-red-400/50"
              title="ยกเลิก"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30">
                <i className="fas fa-search text-green-400"></i>
                <span className="text-green-300 font-semibold">เป้าหมาย: หาคำระเบิดให้เจอ</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-4 border border-green-400/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <i className="fas fa-lightbulb text-green-400"></i>
                </div>
                <h3 className="text-lg font-semibold text-green-300">คำระเบิด = เป้าหมาย</h3>
              </div>
              <p className="text-green-200 text-sm leading-relaxed">
                โหมดนี้ตรงข้ามกับการเล่นหลายคน เมื่อพูดคำระเบิดถูก คุณจะชนะและรับโบนัส +1000 คะแนน
              </p>
            </div>
            <div className="grid gap-4">
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <i className="fas fa-gamepad text-blue-400"></i>
                  วิธีเล่นอย่างรวดเร็ว
                </h3>
                <ol className="space-y-3 text-slate-300 text-sm">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-xs font-bold">1</span>
                    บอทให้คำใบ้เกี่ยวกับคำระเบิด
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-xs font-bold">2</span>
                    พิมพ์คำต่าง ๆ เพื่อค้นหา เป้าหมายคือเดาคำให้ถูก
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 text-xs font-bold">3</span>
                    พูดคำระเบิดถูกต้อง = ชนะ +1000 คะแนน
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-300 text-xs font-bold">4</span>
                    พูดคำซ้ำ = แพ้ทันที ระวังให้ดี!
                  </li>
                </ol>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <i className="fas fa-magic text-purple-400"></i>
                  พาวเวอร์อัพ
                </h3>
                <div className="grid gap-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-shield-alt text-blue-400"></i>
                    Shield: ป้องกันคำซ้ำ 1 ครั้ง
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-lightbulb text-yellow-400"></i>
                    Hint Reveal: เผยคำใบ้เพิ่มเติม
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock text-purple-400"></i>
                    Slow Time: ชะลอบอทลง 50%
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-search text-cyan-400"></i>
                    Word Scanner: วิเคราะห์คำใบ้ให้ชัดเจน
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-400/30">
              <div className="flex items-start gap-3">
                <i className="fas fa-clock text-amber-400 text-lg mt-1"></i>
                <div>
                  <h4 className="font-semibold text-amber-300 mb-1">เวลาจำกัด</h4>
                  <p className="text-amber-200/80 text-sm">คุณมีเวลา 5 นาทีในการหาคำระเบิดให้เจอ</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl p-4 border border-emerald-400/30">
              <h4 className="font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                <i className="fas fa-balance-scale text-emerald-400"></i>
                เปรียบเทียบโหมด Solo vs กลุ่ม
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-green-300 font-semibold mb-1">👤 Solo</div>
                  <div className="text-green-200">คำระเบิด = เป้าหมาย</div>
                  <div className="text-green-200">พูดคำระเบิด = ชนะ ✅</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-red-300 font-semibold mb-1">👥 กลุ่ม</div>
                  <div className="text-red-200">คำระเบิด = อันตราย</div>
                  <div className="text-red-200">พูดคำระเบิด = แพ้ ❌</div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-700/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-2xl border border-slate-600/50 text-slate-300 hover:text-white hover:border-slate-400/60"
            >
              ยังไม่พร้อม
            </button>
            <button
              onClick={() => {
                if (onConfirm) {
                  onConfirm();
                } else {
                  onClose();
                }
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold shadow-lg hover:shadow-purple-500/30"
            >
              พร้อมลุย!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <i className="fas fa-book-open text-white text-lg"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">กติกาการเล่น</h2>
                <p className="text-slate-400 text-sm">โหมดเล่นหลายคน - หลีกเลี่ยงคำระเบิด</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-200 flex items-center justify-center border border-slate-600/50 hover:border-red-400/50"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30">
                <i className="fas fa-shield-alt text-red-400"></i>
                <span className="text-red-300 font-semibold">เป้าหมาย: หลีกเลี่ยงคำระเบิด</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-2xl p-4 border border-red-400/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <i className="fas fa-exclamation text-red-300"></i>
                </div>
                <div>
                  <h3 className="text-white font-semibold">สำคัญ! โหมดนี้ตรงข้ามกับ Solo</h3>
                  <p className="text-slate-300 text-sm">พูดคำระเบิด = แพ้ทันที ต่างจาก Solo ที่พูดคำระเบิด = ชนะ</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                สื่อสารอย่างมีชั้นเชิง หลอกล่อกันด้วยคำใบ้ แต่ต้องไม่เผลอพูดคำต้องห้าม หรือพูดคำที่มีคนกล่าวไปแล้ว
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <i className="fas fa-gamepad text-blue-400"></i>
                วิธีการเล่น
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">1</span>
                  </div>
                  <span className="text-slate-300">เจ้าของห้องจะตั้งคำระเบิดลับ (+ คำใบ้)</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">2</span>
                  </div>
                  <span className="text-slate-300">ผู้เล่นคุยกันโดย<strong className="text-red-400">ห้ามพูดคำระเบิด</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs font-bold">✕</span>
                  </div>
                  <span className="text-slate-300">พูด<strong className="text-red-400">คำระเบิด</strong> หรือ <strong className="text-red-400">คำซ้ำ</strong> = <strong className="text-red-400">ตกรอบทันที</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-400 text-xs font-bold">✓</span>
                  </div>
                  <span className="text-slate-300">รอด<strong className="text-green-400">ครบ 10 นาที</strong> = <strong className="text-green-400">ชนะ!</strong></span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <i className="fas fa-crown text-yellow-400"></i>
                  บทบาทเจ้าของห้อง
                </h4>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li>• ตั้งคำระเบิดและคำใบ้</li>
                  <li>• สามารถรีเซ็ตหรือปิดห้องได้ตลอด</li>
                  <li>• ตัดสินชนะ/แพ้เมื่อหมดเวลา</li>
                </ul>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <i className="fas fa-users text-cyan-400"></i>
                  บทบาทผู้เล่น
                </h4>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li>• สนทนากับเพื่อนอย่างมีไหวพริบ</li>
                  <li>• หลีกเลี่ยงคำซ้ำและคำต้องห้าม</li>
                  <li>• ใช้คำถามยั่วยุเพื่อให้อีกฝ่ายพลาด</li>
                </ul>
              </div>
            </div>
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl p-4 border border-cyan-400/30">
              <h4 className="font-semibold text-cyan-200 mb-3 flex items-center gap-2">
                <i className="fas fa-balance-scale"></i>
                เปรียบเทียบกับโหมด Solo
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-green-300 font-semibold mb-1">👤 Solo</p>
                  <p className="text-slate-200">พูดคำระเบิด = ชนะ</p>
                  <p className="text-slate-400 text-xs">ฝึกทักษะ วิเคราะห์คำใบ้</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-red-300 font-semibold mb-1">👥 Multiplayer</p>
                  <p className="text-slate-200">พูดคำระเบิด = แพ้</p>
                  <p className="text-slate-400 text-xs">ต่อสู้ด้วยการสื่อสารและปั่นประสาท</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-2xl p-4 border border-red-400/30">
              <div className="flex items-start gap-3">
                <i className="fas fa-exclamation-triangle text-red-400 text-lg mt-1"></i>
                <div>
                  <h4 className="font-semibold text-red-300 mb-1">คำเตือน</h4>
                  <p className="text-red-200/80 text-sm">
                    <strong>คำซ้ำ</strong> หมายถึง คำที่มีคนพูดไปแล้ว (ไม่ว่าจะเป็นคุณหรือคนอื่น)<br />
                    <strong>คำระเบิด</strong> คือคำที่เจ้าของห้องตั้งไว้ พูดแล้วตกรอบทันที
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-700/50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <i className="fas fa-check-circle"></i>
            <span>เข้าใจแล้ว!</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;
