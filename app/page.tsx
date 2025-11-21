"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  initializeSupabase,
  createRoom,
  addPlayerToRoom,
  getRoomData,
  updateRoomSettings,
  sendMessage,
  closeRoom,
  resetGame,
  subscribeToRoom,
} from "@/lib/supabase";
import {
  GameState,
  GameScreen as GameScreenType,
  ToastType,
  RoomData,
  DbMessage,
  DbRoom,
} from "@/types/game";
import NameScreen from "@/components/screens/NameScreen";
import LobbyScreen from "@/components/screens/LobbyScreen";
import GameScreenComponent from "@/components/screens/GameScreen";

const FETCH_DEBOUNCE_MS = 120;
const ROUND_DURATION_MS = 10 * 60 * 1000;
const SOLO_SAFE_TURNS_TO_WIN = 8;
const BOT_RESPONSE_DELAY = { min: 1400, max: 2600 };

type SoloBotPreset = {
  botName: string;
  word: string;
  hint: string;
  intro: string;
  responses: string[];
};

const SOLO_BOT_PRESETS: SoloBotPreset[] = [
  // --- หมวด: อาหารและการกิน ---
  {
    botName: "Chef Mario",
    word: "พิซซ่า",
    hint: "อาหารอิตาเลียนทรงกลมมีหน้าต่างๆ",
    intro:
      "ยินดีต้อนรับสู่ครัวของมาริโอ้! วันนี้ฉันอบของอร่อยไว้ แต่อย่าเผลอเรียกชื่อมันนะ",
    responses: [
      "กลิ่นชีสหอมไหมล่ะ?",
      "ระวังนะ แป้งบางกรอบอาจจะบาดปากถ้าพูดผิด",
      "เมนูนี้ต้องแบ่งกันกินเป็นชิ้นสามเหลี่ยม",
      "คำใบ้สุดพิเศษ: {hint}",
    ],
  },
  {
    botName: "Spicy Auntie",
    word: "ส้มตำ",
    hint: "อาหารอีสานรสแซ่บ",
    intro:
      "กินข้าวหรือยังลูก? ป้ากำลังตำของแซ่บอยู่ อย่าพูดชื่อเมนูนะ เดี๋ยวป้าตำพริกเข้าตา",
    responses: [
      "เสียงครกดัง โป๊กๆๆ ได้ยินไหม?",
      "รสชาติจัดจ้านถึงใจ ต้องใส่มะละกอ",
      "ระวังนะ คำนี้พูดแล้วน้ำลายสอ",
      "ชื่อเมนูนี้มี {length} ตัวอักษรเอง ง่ายๆ",
    ],
  },

  // --- หมวด: ธรรมชาติและสัตว์ ---
  {
    botName: "Meow Master",
    word: "ปลา",
    hint: "สัตว์น้ำที่เป็นของโปรดแมว",
    intro:
      "เมี๊ยว... ข้าคือเจ้าถิ่นแถวนี้ ถ้าไม่อยากโดนข่วน อย่าแย่งของกินข้าพูด",
    responses: [
      "มันว่ายอยู่ในน้ำ... บุ๋งๆ",
      "ระวังจะโดนก้างติดคอนะ",
      "เจ้ามนุษย์... ข้าได้กลิ่นคาวๆ แถวนี้",
      "คำนี้สั้นมาก มีแค่ {length} พยางค์เอง",
    ],
  },
  {
    botName: "Forest Guardian",
    word: "ต้นไม้",
    hint: "สิ่งที่ให้ร่มเงาและออกซิเจน",
    intro: "ป่านี้เป็นเขตหวงห้าม ธรรมชาติกำลังฟังท่านอยู่ ระวังวาจาด้วย",
    responses: [
      "ใบสีเขียว... ลำต้นสีน้ำตาล...",
      "สิ่งนี้ช่วยฟอกอากาศให้โลกนะ",
      "ยิ่งปลูกเยอะ โลกยิ่งเย็น",
      "ลองมองไปรอบๆ ตัวสิ ท่านเห็นอะไรสูงๆ บ้าง?",
    ],
  },

  // --- หมวด: เทคโนโลยีและวิทยาศาสตร์ ---
  {
    botName: "Cyber Punk",
    word: "อินเทอร์เน็ต",
    hint: "เครือข่ายที่เชื่อมโลกเข้าด้วยกัน",
    intro:
      "โลกยุคนี้ขับเคลื่อนด้วยข้อมูล... ข้าแฮ็กระบบไว้หมดแล้ว ยกเว้นคำคำหนึ่ง",
    responses: [
      "ขาดสิ่งนี้ไป เหมือนขาดใจเลยใช่ไหม?",
      "WiFi ที่บ้านแรงดีหรือเปล่า?",
      "เรากำลังสื่อสารผ่านสิ่งนี้อยู่นะ",
      "คำใบ้จากระบบ: {hint}",
    ],
  },
  {
    botName: "Astro Boy",
    word: "ดวงจันทร์",
    hint: "ดาวบริวารของโลก ส่องสว่างตอนกลางคืน",
    intro:
      "สวมชุดอวกาศให้พร้อม! เรากำลังจะไปยานแม่ แต่ห้ามพูดถึงจุดหมายปลายทาง",
    responses: [
      "มองขึ้นไปบนฟ้าตอนกลางคืนสิ",
      "กระต่ายหมายจันทร์... อุ๊ย เกือบหลุดปาก",
      "น้ำขึ้นน้ำลงเกิดจากแรงดึงดูดของสิ่งนี้",
      "คำนี้ยาว {length} ตัวอักษร ลองนับดูดีๆ",
    ],
  },

  // --- หมวด: แฟนตาซีและเรื่องลึกลับ ---
  {
    botName: "Shadow Spirit",
    word: "ผี",
    hint: "วิญญาณที่คนกลัว",
    intro:
      "บอระเพ็ด... ขนลุก... ที่นี่มืดจังเลยนะ อย่าทักสิ่งที่มองไม่เห็นล่ะ",
    responses: [
      "แบร่!! ตกใจไหม?",
      "บางคนเชื่อ บางคนไม่เชื่อ แต่ฉันมีตัวตนนะ",
      "ระวังข้างหลังคุณให้ดี...",
      "คำสั้นๆ พยางค์เดียว แต่น่ากลัวพิลึก",
    ],
  },
  {
    botName: "Dragon Lord",
    word: "ไฟ",
    hint: "ความร้อนที่เผาผลาญทุกอย่าง",
    intro:
      "ข้าคือมังกรผู้ยิ่งใหญ่! ลมหายใจของข้าคือคำต้องห้าม ร้อนแรงดั่งนรก",
    responses: [
      "ร้อน... ร้อนมาก!",
      "สีแดง สีส้ม... เต้นระบำได้",
      "น้ำคือศัตรูของข้า",
      "ถ้าพูดคำนี้ออกมา ปากจะพองเอานะ",
    ],
  },

  // --- หมวด: ชีวิตประจำวัน ---
  {
    botName: "Teacher Glasses",
    word: "การบ้าน",
    hint: "งานที่ครูสั่งให้ทำที่บ้าน",
    intro:
      "นักเรียนทุกคน เงียบ! วันนี้ครูอารมณ์ดี แต่อย่าถามถึงสิ่งที่ต้องส่งพรุ่งนี้เชียว",
    responses: [
      "ทำเสร็จหรือยัง? อย่าลอกเพื่อนนะ",
      "สิ่งนี้ทำให้นักเรียนหลายคนนอนดึก",
      "ส่งสมุดวางไว้บนโต๊ะครูเลย",
      "คำใบ้สำหรับการศึกษา: {hint}",
    ],
  },
  {
    botName: "Richie Rich",
    word: "เงิน",
    hint: "สิ่งที่ใช้แลกเปลี่ยนสินค้า",
    intro:
      "สวัสดีครับคนจน เอ้ย คนธรรมดา! ผมรวยล้นฟ้า แต่มีคำหนึ่งที่ผมเบื่อจะฟัง",
    responses: [
      "มีเท่าไหร่ก็ไม่พอใช้ใช่ไหมล่ะ?",
      "กระดาษใบนี้เปลี่ยนชีวิตคนได้นะ",
      "งานคือ... ...คือบันดาลสุข",
      "พยางค์เดียว สั้นๆ แต่ใครๆ ก็อยากได้",
    ],
  },
  {
    botName: "Bedtime Bear",
    word: "ฝันดี",
    hint: "คำบอกลาเสมือนคำอวยพรก่อนนอน",
    intro: "ง่วงจังเลย... หาววว... อย่าเพิ่งรีบไปนอนนะ คุยกันก่อน",
    responses: [
      "เจอกันในความฝันนะ",
      "หลับให้สบาย... ZZzz...",
      "ปกติเราพูดคำนี้ตอนกลางคืน",
      "คำบอกลาที่แสนอบอุ่น ยาว {length} ตัวอักษร",
    ],
  },
  {
    botName: "Driver Dan",
    word: "รถติด",
    hint: "สถานการณ์จราจรที่ไม่ขยับ",
    intro:
      "บีบแตรทำไมนักหนา! ถนนเส้นนี้มันนรกชัดๆ อย่าพูดคำที่ทำให้หงุดหงิดนะ",
    responses: [
      "ไฟแดงนานไปไหมเนี่ย?",
      "กรุงเทพฯ ชีวิตดีๆ ที่ลงตัว... หรอ?",
      "ขยับทีละนิด หงุดหงิดจังเลย",
      "ใบ้ให้ว่า: {hint}",
    ],
  },

  // --- หมวด: ชีวิตคนทำงานและคนเมือง ---
  {
    botName: "Salary Man",
    word: "เงินเดือน",
    hint: "สิ่งที่มนุษย์เงินเดือนรอคอยทุกสิ้นเดือน",
    intro:
      "เห้อ... งานหนักจัง เมื่อไหร่จะสิ้นเดือนนะ อย่าพูดสิ่งที่ผมรอคอยล่ะ เดี๋ยวร้องไห้",
    responses: [
      "เข้าบัญชีปุ๊บ ออกปั๊บ เหมือนมายากล",
      "สิ่งนี้คือเหตุผลที่ผมยอมตื่นเช้าทุกวัน",
      "มาช้าแต่ไปไว... เศร้าจัง",
      "คำใบ้คือ: {hint}",
    ],
  },
  {
    botName: "Cafe Hopper",
    word: "กาแฟ",
    hint: "เครื่องดื่มสีดำ มีคาเฟอีน",
    intro:
      "กลิ่นหอมคั่วบดนี่มันชื่นใจจริงๆ... วันนี้รับอะไรดีคะ? ห้ามสั่งเมนูหลักนะ",
    responses: [
      "อาราบิก้า หรือ โรบัสต้า ดีล่ะ?",
      "ถ้าขาดแก้วนี้ไป ฉันคงตาไม่สว่าง",
      "บางคนชอบขม บางคนชอบหวานมัน",
      "เมนูยอดฮิตยามเช้า ยาว {length} ตัวอักษร",
    ],
  },
  {
    botName: "Fitness Guy",
    word: "อ้วน",
    hint: "คำตรงข้ามกับผอม สภาพร่างกายที่มีไขมันเยอะ",
    intro: "เฮ้พวก! มาเบิร์นไขมันกันหน่อย อย่าพูดคำที่แสลงหูคนลดน้ำหนักนะ",
    responses: [
      "กินเยอะระวังพุงออกนะ",
      "คำนี้ใครโดนทักมีเคืองแน่นอน",
      "หมูสามชั้นเป็นศัตรูของสิ่งนี้",
      "อย่าให้ตาชั่งบอกว่าคุณกำลัง... {hint}",
    ],
  },

  // --- หมวด: ของใช้และเทคโนโลยี ---
  {
    botName: "Gadget Geek",
    word: "มือถือ",
    hint: "อวัยวะที่ 33 ของคนยุคนี้",
    intro:
      "แบตเหลือ 10% แล้ว! ขอยืมสายชาร์จหน่อย... อย่าเรียกชื่ออุปกรณ์นะ",
    responses: [
      "สังคมก้มหน้า เพราะมัวแต่จ้องสิ่งนี้",
      "มีทั้งจอสัมผัส กล้อง และแอพมากมาย",
      "วางมันลงบ้าง แล้วคุยกับคนข้างๆ เถอะ",
      "คำสั้นๆ แต่ขาดไม่ได้ในชีวิตประจำวัน",
    ],
  },
  {
    botName: "Clean Bot",
    word: "ขยะ",
    hint: "ของเหลือใช้ สิ่งปฏิกูล",
    intro: "ปี๊บๆ... ตรวจพบความสกปรก! กรุณาทิ้งให้ลงถัง ห้ามพูดชื่อมัน",
    responses: [
      "เหม็นนะ อย่าเก็บไว้",
      "แยกประเภทก่อนทิ้งด้วย รีไซเคิลได้ไหม?",
      "สิ่งที่ทุกคนรังเกียจ",
      "คำใบ้: {hint}",
    ],
  },
  {
    botName: "Tikky Tok",
    word: "เต้น",
    hint: "การขยับร่างกายประกอบจังหวะ",
    intro: "เพลงมา! ขยับแข้งขยับขาหน่อย แต่อย่าบอกนะว่าเรากำลังทำอะไร",
    responses: [
      "ซ้าย ขวา ซ้าย... เข้าจังหวะหน่อย",
      "ใครๆ ก็ทำชาเลนจ์นี้ในแอพดัง",
      "สายย่อ สายร่อน ต้องชอบสิ่งนี้",
      "กิจกรรมเข้าจังหวะ ยาว {length} ตัวอักษร",
    ],
  },

  // --- หมวด: ธรรมชาติและสัตว์โลก ---
  {
    botName: "Doggy Dog",
    word: "กระดูก",
    hint: "โครงสร้างร่างกาย หรือของชอบของหมา",
    intro:
      "โฮ่ง! โฮ่ง! กระดิกหางดิ๊กๆ... ข้าซ่อนของโปรดไว้หลังสวน อย่าบอกใครนะ",
    responses: [
      "แคลเซียมสูงนะ จะบอกให้",
      "หมาเห็นแล้วต้องวิ่งใส่",
      "สีขาวๆ แข็งๆ อยู่ในร่างกายเรา",
      "ขุดดินฝังสิ่งนี้ไว้",
    ],
  },
  {
    botName: "Rain Girl",
    word: "ร่ม",
    hint: "อุปกรณ์กันฝน",
    intro: "ฟ้าครึ้มมาแล้ว... เปียกปอนไปหมดเลย ลืมหยิบสิ่งนั้นมาหรือเปล่า?",
    responses: [
      "กางออกแล้วจะไม่เปียก",
      "ระวังลมพัดปลิวไปนะ",
      "ถือไว้กันแดดก็ได้ กันฝนก็ดี",
      "คำสั้นๆ {length} พยางค์ ไว้ใช้หน้าฝน",
    ],
  },
  {
    botName: "Sun Shine",
    word: "ร้อน",
    hint: "อุณหภูมิที่สูง",
    intro:
      "พระอาทิตย์เมืองไทยนี่มันสู้ชีวิตจริงๆ... เหงื่อไหลหมดแล้ว อย่าบ่นคำนั้นนะ",
    responses: [
      "ตรงข้ามกับหนาวสุดขั้ว",
      "เหงื่อไหลไคลย้อยเพราะสิ่งนี้",
      "เปิดแอร์ช่วยได้นิดหน่อย",
      "ความรู้สึกตอนยืนกลางแดดเปรี้ยงๆ",
    ],
  },

  // --- หมวด: ความเชื่อและเรื่องลึกลับ ---
  {
    botName: "Lucky Auntie",
    word: "หวย",
    hint: "สลากกินแบ่งที่ลุ้นทุกวันที่ 1 และ 16",
    intro:
      "งวดนี้เลขเด็ดอะไรจ๊ะหลาน? ป้าฝันแม่นนะ แต่อย่าพูดชื่อสลากนะ ตำรวจจับ",
    responses: [
      "รางวัลที่ 1 อยู่แค่เอื้อม",
      "โดนกินเรียบอีกแล้วสินะ",
      "วันที่ 1 กับ 16 หัวใจจะวาย",
      "คนจนเล่นห... เอ้ย! เกือบหลุดปาก",
    ],
  },
  {
    botName: "Alien X",
    word: "โลก",
    hint: "ดาวเคราะห์ที่เราอาศัยอยู่",
    intro:
      "##@!$$... ข้าเดินทางมาจากกาแล็กซี่อันไกลโพ้น เพื่อยึดดาวดวงนี้!",
    responses: [
      "ดาวเคราะห์สีน้ำเงิน... ช่างสวยงาม",
      "มีมนุษย์อาศัยอยู่มากมาย",
      "เป็นดาวลำดับที่ 3 ในระบบสุริยะ",
      "คำนี้หมายถึงที่ที่เรายืนอยู่",
    ],
  },

  // --- หมวด: แฟนตาซีและนิทาน ---
  {
    botName: "Princess Rose",
    word: "จูบ",
    hint: "การแสดงความรักด้วยริมฝีปาก",
    intro:
      "เจ้าชายขี่ม้าขาวมาแล้ว... ฉันรอคอยเวทมนตร์ที่จะปลุกฉันตื่น ห้ามพูดนะ เขิน!",
    responses: [
      "ริมฝีปากชนกัน... อุ๊ย",
      "รักแท้เท่านั้นที่จะทำลายคำสาป",
      "ฝรั่งเขาทำเพื่อทักทายกันด้วยนะ",
      "กริยานี้ใช้ปากทำ",
    ],
  },
  {
    botName: "Ninja Hattori",
    word: "ดาวกระจาย",
    hint: "อาวุธลับของนินจา",
    intro:
      "วิชานินจา! หายตัว... ชิ้ง! ข้ามีอาวุธลับอยู่ในมือ อย่าเอ่ยชื่อมัน",
    responses: [
      "ขว้างไปแล้วปักฉึก!",
      "รูปร่างเหมือนดาว แหลมคมมาก",
      "นารูโตะชอบใช้สิ่งนี้",
      "อาวุธซัดระยะไกลของญี่ปุ่น",
    ],
  },

  // --- หมวด: กวนโอ๊ยและตลก ---
  {
    botName: "Joker Bot",
    word: "หัวเราะ",
    hint: "อาการแสดงความตลกขบขัน",
    intro: "ทำหน้าเครียดทำไม? ยิ้มหน่อยสิ... แต่อย่าส่งเสียงดังออกมานะ",
    responses: [
      "ฮ่า ฮ่า ฮ่า... เอ้ย เกือบไป",
      "ตลกคาเฟ่ชอบทำให้เราทำสิ่งนี้",
      "ยาอายุวัฒนะชั้นดี คือการ...",
      "อาการที่เกิดเมื่อเจอเรื่องขำขัน",
    ],
  },
  {
    botName: "Detective Conan",
    word: "คนร้าย",
    hint: "ผู้กระทำความผิด",
    intro: "ความจริงมีเพียงหนึ่งเดียว! ใครคือผู้ก่อเหตุในคดีนี้?",
    responses: [
      "เงาสีดำๆ ในการ์ตูน",
      "ตำรวจกำลังตามจับตัวอยู่",
      "เขาคือผู้ที่ทำผิดกฎหมาย",
      "คำใบ้: {hint}",
    ],
  },
  {
    botName: "Lazy Boy",
    word: "นอน",
    hint: "การพักผ่อนบนเตียง",
    intro: "ครอกฟี้... อย่ากวน... คนกำลังพักผ่อน ห้ามพูดคำกริยานี้นะ",
    responses: [
      "เตียงดูดวิญญาณจริงๆ",
      "ฝันดีนะ... ZZzz",
      "สิ่งที่อยากทำที่สุดในวันจันทร์",
      "หลับตาพริ้มแล้วก็...",
    ],
  },
];

const normalizeLocalText = (text: string) => text.trim().toLowerCase();

interface SoloSessionState {
  bombWord: string;
  hint: string;
  responses: string[];
  safeTurns: number;
  messageSeq: number;
  botName: string;
}

export default function ChatBombGame() {
  const [gameState, setGameState] = useState<GameState>({
    userId: null,
    playerName: null,
    currentRoomId: null,
    currentRoomData: null,
    currentScreen: "loading",
    sessionType: "multiplayer",
  });

  const [playerNameInput, setPlayerNameInput] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [bombWordInput, setBombWordInput] = useState("");
  const [hintInput, setHintInput] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [autoReturnCountdown, setAutoReturnCountdown] = useState<number | null>(
    null
  );
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);

  const unsubscribeRoomListener = useRef<{ unsubscribe: () => void } | null>(
    null
  );
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const roomFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoReturnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const soloSessionRef = useRef<SoloSessionState | null>(null);
  const soloBotTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownCloseToastRef = useRef(false);

  const clearSoloBotTimer = useCallback(() => {
    if (soloBotTimeoutRef.current) {
      clearTimeout(soloBotTimeoutRef.current);
      soloBotTimeoutRef.current = null;
    }
  }, []);

  const resetSoloSession = useCallback(() => {
    clearSoloBotTimer();
    soloSessionRef.current = null;
  }, [clearSoloBotTimer]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    const bgClass =
      type === "error"
        ? "bg-gradient-to-r from-red-600 to-red-500 border-red-400/50 shadow-red-500/30"
        : type === "success"
        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-400/50 shadow-emerald-500/30"
        : "bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400/50 shadow-blue-500/30";

    const icon =
      type === "error"
        ? "fa-triangle-exclamation"
        : type === "success"
        ? "fa-circle-check"
        : "fa-circle-info";

    toast.className = `${bgClass} text-white px-5 py-4 rounded-2xl shadow-2xl transform transition-all duration-500 translate-x-full flex items-center gap-3 pointer-events-auto border-2 backdrop-blur-xl w-80 hover:scale-105`;
    toast.innerHTML = `<div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><i class="fas ${icon} text-lg"></i></div><span class="text-sm font-semibold leading-tight">${message}</span>`;

    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove("translate-x-full"));

    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-x-full", "scale-95");
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { userId } = await initializeSupabase();
        const savedName = localStorage.getItem("chat_bomb_name");
        setGameState((prev) => ({
          ...prev,
          userId,
          playerName: savedName,
          currentScreen: savedName ? "lobby" : "name",
        }));
      } catch (error) {
        console.error("Supabase initialization failed:", error);
        showToast("การเชื่อมต่อล้มเหลว", "error");
      }
    };

    init();
  }, [showToast]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [gameState.currentRoomData?.messages]);

  useEffect(() => {
    return () => {
      if (roomFetchTimeoutRef.current) {
        clearTimeout(roomFetchTimeoutRef.current);
      }
      if (unsubscribeRoomListener.current) {
        unsubscribeRoomListener.current.unsubscribe();
      }
      if (autoReturnIntervalRef.current) {
        clearInterval(autoReturnIntervalRef.current);
      }
      if (roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
      }
      clearSoloBotTimer();
    };
  }, [clearSoloBotTimer]);

  const switchScreen = useCallback((screen: GameScreenType) => {
    setGameState((prev) => ({ ...prev, currentScreen: screen }));
  }, []);

  const enterWithName = () => {
    const name = playerNameInput.trim();
    if (!name) return showToast("กรุณาระบุชื่อผู้ใช้งาน", "error");

    localStorage.setItem("chat_bomb_name", name);
    setGameState((prev) => ({ ...prev, playerName: name }));
    switchScreen("lobby");
  };

  const generateRoomCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const createRoomFunc = async () => {
    if (!gameState.userId || !gameState.playerName || isCreatingRoom) return;

    const newRoomId = generateRoomCode();

    try {
      setIsCreatingRoom(true);
      const roomData = await createRoom(
        newRoomId,
        gameState.userId,
        gameState.playerName
      );
      enterGame(roomData.room.room_id);
      showToast(`สร้างห้องสำเร็จ (รหัส ${roomData.room.room_id})`, "success");
    } catch (e) {
      console.error("Error creating room:", e);
      showToast("สร้างห้องไม่สำเร็จ", "error");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const enterGame = (roomId: string) => {
    setGameState((prev) => ({
      ...prev,
      currentRoomId: roomId,
      sessionType: "multiplayer",
    }));
    switchScreen("game");
    listenToRoom(roomId);
  };

  const leaveRoom = useCallback(() => {
    if (unsubscribeRoomListener.current) {
      unsubscribeRoomListener.current.unsubscribe();
      unsubscribeRoomListener.current = null;
    }
    if (roomFetchTimeoutRef.current) {
      clearTimeout(roomFetchTimeoutRef.current);
      roomFetchTimeoutRef.current = null;
    }
    if (autoReturnIntervalRef.current) {
      clearInterval(autoReturnIntervalRef.current);
      autoReturnIntervalRef.current = null;
    }
    resetSoloSession();
    setAutoReturnCountdown(null);
    hasShownCloseToastRef.current = false;
    setGameState((prev) => ({
      ...prev,
      currentRoomId: null,
      currentRoomData: null,
      sessionType: "multiplayer",
    }));
    switchScreen("lobby");
    setChatInput("");
    setRoomCodeInput("");
  }, [switchScreen, resetSoloSession]);

  const listenToRoom = (roomId: string) => {
    if (unsubscribeRoomListener.current) {
      unsubscribeRoomListener.current.unsubscribe();
      unsubscribeRoomListener.current = null;
    }
    if (roomFetchTimeoutRef.current) {
      clearTimeout(roomFetchTimeoutRef.current);
      roomFetchTimeoutRef.current = null;
    }

    let retryCount = 0;
    const MAX_RETRIES = 3;

    const scheduleRefresh = () => {
      if (roomFetchTimeoutRef.current) {
        clearTimeout(roomFetchTimeoutRef.current);
      }
      roomFetchTimeoutRef.current = setTimeout(() => {
        fetchSnapshot(false);
        roomFetchTimeoutRef.current = null;
      }, FETCH_DEBOUNCE_MS);
    };

    const fetchSnapshot = async (isInitialLoad = false) => {
      try {
        const data = await getRoomData(roomId);
        retryCount = 0; // Reset on success

        if (data.room.status === "CLOSED") {
          if (!hasShownCloseToastRef.current) {
            showToast("ห้องถูกปิดแล้ว! ดูโพเดียมได้เลย", "info");
            hasShownCloseToastRef.current = true;
          }
        } else if (hasShownCloseToastRef.current) {
          hasShownCloseToastRef.current = false;
        }

        setGameState((prev) => ({ ...prev, currentRoomData: data }));
      } catch (error) {
        console.error("Error fetching room data:", error);

        // Retry logic for initial load
        if (isInitialLoad && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
          setTimeout(() => fetchSnapshot(true), 1000 * retryCount); // Progressive delay
          return;
        }

        // Show error and leave only after all retries failed
        showToast("ไม่สามารถโหลดข้อมูลห้องได้", "error");
        leaveRoom();
      }
    };

    fetchSnapshot(true); // Initial load with retry

    const realtimeChannel = subscribeToRoom(roomId, () => {
      scheduleRefresh();
    });

    if (realtimeChannel) {
      console.info("✅ Subscribed to realtime updates for room", roomId);
      unsubscribeRoomListener.current = {
        unsubscribe: () => {
          realtimeChannel.unsubscribe();
        },
      } as any;
    } else {
      console.warn("⚠️ Realtime unavailable. Falling back to polling every 3s");
      const pollInterval = setInterval(() => {
        fetchSnapshot(false);
      }, 3000);

      unsubscribeRoomListener.current = {
        unsubscribe: () => clearInterval(pollInterval),
      } as any;
    }
  };

  const addSoloBotMessage = () => {
    const session = soloSessionRef.current;
    if (!session) return;

    const nowIso = new Date().toISOString();
    const templateIndex = session.safeTurns % session.responses.length;
    const template =
      session.responses[templateIndex] ?? "ฉันยังรอให้คุณเผลออยู่เลยนะ";
    const rendered = template
      .replace("{hint}", session.hint)
      .replace("{length}", session.bombWord.length.toString());

    const messageId = session.messageSeq++;
    const botMessage = {
      id: messageId,
      room_id: "SOLO",
      sender_id: "solo-bot",
      sender_name: session.botName,
      message_text: rendered,
      is_boom: false,
      created_at: nowIso,
    } as DbMessage;

    setGameState((prev) => {
      if (!prev.currentRoomData) return prev;
      return {
        ...prev,
        currentRoomData: {
          ...prev.currentRoomData,
          messages: [...(prev.currentRoomData.messages ?? []), botMessage],
        },
      };
    });
  };

  const scheduleSoloBotResponse = () => {
    if (!soloSessionRef.current) return;
    clearSoloBotTimer();
    const delay =
      BOT_RESPONSE_DELAY.min +
      Math.random() * (BOT_RESPONSE_DELAY.max - BOT_RESPONSE_DELAY.min);
    soloBotTimeoutRef.current = setTimeout(() => {
      addSoloBotMessage();
    }, delay);
  };

  const completeSoloRound = (result: "success" | "fail") => {
    const sessionSnapshot = soloSessionRef.current;
    clearSoloBotTimer();
    soloSessionRef.current = null;
    const nowIso = new Date().toISOString();

    setGameState((prev) => {
      if (!prev.currentRoomData) return prev;
      const updatedRoom: DbRoom = {
        ...prev.currentRoomData.room,
        status: "CLOSED",
        updated_at: nowIso,
      };
      let updatedMessages = prev.currentRoomData.messages ?? [];

      if (result === "success") {
        const successMessage: DbMessage = {
          id: sessionSnapshot?.messageSeq ?? Date.now(),
          room_id: prev.currentRoomData.room.room_id,
          sender_id: "system_timer",
          sender_name: "ระบบจับเวลา",
          message_text: "ทุกคนเก่งมากที่ยังอยู่รอด",
          is_boom: false,
          created_at: nowIso,
        };
        updatedMessages = [...updatedMessages, successMessage];
      }

      return {
        ...prev,
        currentRoomData: {
          ...prev.currentRoomData,
          room: updatedRoom,
          messages: updatedMessages,
        },
      };
    });

    if (result === "success") {
      showToast("สุดยอด! คุณรอดจาก Solo Bot", "success");
    }
  };

  const handleSoloPlayerMessage = () => {
    if (!gameState.playerName || !gameState.userId) return;
    const session = soloSessionRef.current;
    const roomData = gameState.currentRoomData;
    if (!session || !roomData || roomData.room.status !== "PLAYING") return;

    const text = chatInput.trim();
    if (!text) return;

    const normalized = normalizeLocalText(text);
    const isDuplicate = (roomData.messages ?? []).some(
      (msg) => normalizeLocalText(msg.message_text) === normalized
    );
    const isBoom = normalized === session.bombWord;
    const shouldEliminate = isBoom || isDuplicate;
    const nowIso = new Date().toISOString();
    const messageId = session.messageSeq++;

    const playerMessage: DbMessage = {
      id: messageId,
      room_id: "SOLO",
      sender_id: gameState.userId,
      sender_name: gameState.playerName,
      message_text: text,
      is_boom: shouldEliminate,
      created_at: nowIso,
    };

    setGameState((prev) => {
      if (!prev.currentRoomData) return prev;
      const updatedPlayers = prev.currentRoomData.players?.map((p) =>
        p.player_id === prev.userId
          ? { ...p, is_eliminated: shouldEliminate }
          : p
      );
      const updatedRoom: DbRoom = shouldEliminate
        ? { ...prev.currentRoomData.room, status: "CLOSED", updated_at: nowIso }
        : prev.currentRoomData.room;
      return {
        ...prev,
        currentRoomData: {
          ...prev.currentRoomData,
          room: updatedRoom,
          players: updatedPlayers,
          messages: [...(prev.currentRoomData.messages ?? []), playerMessage],
        },
      };
    });

    setChatInput("");

    if (shouldEliminate) {
      showToast(
        isDuplicate ? "ข้อความซ้ำ! โดนคัดออกแล้ว" : "คุณสะดุดกับดักของบอทแล้ว",
        "error"
      );
      completeSoloRound("fail");
      return;
    }

    session.safeTurns += 1;

    if (session.safeTurns >= SOLO_SAFE_TURNS_TO_WIN) {
      completeSoloRound("success");
    } else {
      scheduleSoloBotResponse();
    }
  };

  const startSoloMode = () => {
    if (!gameState.userId || !gameState.playerName) {
      return showToast("กรุณาตั้งชื่อก่อนเริ่มเล่นคนเดียว", "error");
    }

    const preset =
      SOLO_BOT_PRESETS[Math.floor(Math.random() * SOLO_BOT_PRESETS.length)];
    if (!preset) {
      return showToast("ไม่สามารถเลือกบอทได้", "error");
    }

    resetSoloSession();

    const normalizedWord = normalizeLocalText(preset.word);
    const nowIso = new Date().toISOString();

    soloSessionRef.current = {
      bombWord: normalizedWord,
      hint: preset.hint,
      responses: preset.responses,
      safeTurns: 0,
      messageSeq: 2,
      botName: preset.botName,
    };

    const soloRoom: RoomData = {
      room: {
        id: -1,
        room_id: "SOLO",
        owner_id: gameState.userId,
        status: "PLAYING",
        bomb_word: normalizedWord,
        hint: preset.hint,
        setter_id: "solo-bot",
        setter_name: preset.botName,
        round_started_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      },
      players: [
        {
          id: -1,
          room_id: "SOLO",
          player_id: gameState.userId,
          player_name: gameState.playerName,
          is_eliminated: false,
          joined_at: nowIso,
        },
        {
          id: -2,
          room_id: "SOLO",
          player_id: "solo-bot",
          player_name: preset.botName,
          is_eliminated: false,
          joined_at: nowIso,
        },
      ],
      messages: [
        {
          id: 1,
          room_id: "SOLO",
          sender_id: "solo-bot",
          sender_name: preset.botName,
          message_text: preset.intro,
          is_boom: false,
          created_at: nowIso,
        },
      ],
    };

    setGameState((prev) => ({
      ...prev,
      sessionType: "solo",
      currentRoomId: "SOLO",
      currentRoomData: soloRoom,
      currentScreen: "game",
    }));
    setChatInput("");
    setRoundTimeLeft(Math.floor(ROUND_DURATION_MS / 1000));
    showToast(`เริ่มโหมดเล่นคนเดียวกับ ${preset.botName}!`, "info");
    scheduleSoloBotResponse();
  };

  useEffect(() => {
    const room = gameState.currentRoomData?.room;
    const userId = gameState.userId;

    if (!room || !userId) {
      if (autoReturnCountdown !== null) {
        setAutoReturnCountdown(null);
      }
      return;
    }

    const isOwner = room.owner_id === userId;
    if (room.status === "CLOSED" && !isOwner) {
      if (autoReturnCountdown === null) {
        setAutoReturnCountdown(20);
      }
    } else if (autoReturnCountdown !== null) {
      setAutoReturnCountdown(null);
    }
  }, [gameState.currentRoomData, gameState.userId, autoReturnCountdown]);

  useEffect(() => {
    if (autoReturnCountdown === null) {
      if (autoReturnIntervalRef.current) {
        clearInterval(autoReturnIntervalRef.current);
        autoReturnIntervalRef.current = null;
      }
      return;
    }

    if (autoReturnIntervalRef.current) {
      clearInterval(autoReturnIntervalRef.current);
      autoReturnIntervalRef.current = null;
    }

    autoReturnIntervalRef.current = setInterval(() => {
      setAutoReturnCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (autoReturnIntervalRef.current) {
            clearInterval(autoReturnIntervalRef.current);
            autoReturnIntervalRef.current = null;
          }
          showToast("กลับสู่ Lobby โดยอัตโนมัติ", "info");
          leaveRoom();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (autoReturnIntervalRef.current) {
        clearInterval(autoReturnIntervalRef.current);
        autoReturnIntervalRef.current = null;
      }
    };
  }, [autoReturnCountdown, leaveRoom, showToast]);

  useEffect(() => {
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }

    const roundStart = gameState.currentRoomData?.room.round_started_at;
    const roundStatus = gameState.currentRoomData?.room.status;

    if (!roundStart || roundStatus !== "PLAYING") {
      setRoundTimeLeft(null);
      return;
    }

    const endTime = new Date(roundStart).getTime() + ROUND_DURATION_MS;

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRoundTimeLeft(diff);
      if (diff <= 0 && roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
        roundTimerRef.current = null;
      }
    };

    updateCountdown();
    roundTimerRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
        roundTimerRef.current = null;
      }
    };
  }, [
    gameState.currentRoomData?.room.round_started_at,
    gameState.currentRoomData?.room.status,
  ]);

  const openSetupModal = () => {
    if (gameState.currentRoomData?.room.bomb_word) {
      setBombWordInput(gameState.currentRoomData.room.bomb_word);
      setHintInput(gameState.currentRoomData.room.hint || "");
    } else {
      setBombWordInput("");
      setHintInput("");
    }
    setShowSetupModal(true);
  };

  const setBombWord = async () => {
    if (gameState.sessionType === "solo") {
      return showToast("โหมดเล่นคนเดียวไม่สามารถแก้คำต้องห้ามได้", "error");
    }
    if (!gameState.currentRoomId || !gameState.userId || !gameState.playerName)
      return;

    const word = bombWordInput.trim();
    const hint = hintInput.trim();
    if (!word) return showToast("กรุณาระบุคำต้องห้าม", "error");

    try {
      const roomData = await updateRoomSettings(
        gameState.currentRoomId,
        word,
        hint,
        gameState.userId,
        gameState.playerName
      );
      setGameState((prev) => ({
        ...prev,
        currentRoomData: roomData,
      }));
      setShowSetupModal(false);
      showToast("ตั้งค่าเรียบร้อย", "success");
    } catch (error) {
      console.error("Error setting bomb word:", error);
      showToast("ไม่สามารถตั้งค่าได้", "error");
    }
  };

  const joinRoomFunc = async (codeInput?: string) => {
    if (!gameState.userId || !gameState.playerName) return;

    const code = (codeInput ?? roomCodeInput).trim();
    if (code.length !== 6) return showToast("รหัสห้องไม่ถูกต้อง", "error");

    try {
      await addPlayerToRoom(code, gameState.userId, gameState.playerName);
      enterGame(code);
    } catch (error: any) {
      console.error("Error joining room:", error);
      showToast(error?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  const sendChatMessage = async () => {
    if (!gameState.userId || !gameState.playerName) return;
    if (
      !gameState.currentRoomData ||
      gameState.currentRoomData.room.status !== "PLAYING"
    )
      return;

    if (gameState.sessionType === "solo") {
      handleSoloPlayerMessage();
      return;
    }

    if (!gameState.currentRoomId) return;

    const text = chatInput.trim();
    if (!text) return;

    const isEliminated = gameState.currentRoomData.players?.some(
      (p) => p.player_id === gameState.userId && p.is_eliminated
    );
    if (isEliminated) {
      return showToast("คุณถูกตัดออกจากรอบนี้แล้ว", "error");
    }

    try {
      const updatedRoom = await sendMessage(
        gameState.currentRoomId,
        gameState.userId,
        gameState.playerName,
        text
      );
      setGameState((prev) => ({ ...prev, currentRoomData: updatedRoom }));
      setChatInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("ไม่สามารถส่งข้อความได้", "error");
    }
  };

  const confirmCloseRoom = async () => {
    if (gameState.sessionType === "solo") {
      resetSoloSession();
      leaveRoom();
      return;
    }
    if (!gameState.currentRoomId || !gameState.userId) return;
    setShowConfirmModal(false);

    try {
      const closedRoom = await closeRoom(
        gameState.currentRoomId,
        gameState.userId
      );
      hasShownCloseToastRef.current = true;
      setGameState((prev) => ({ ...prev, currentRoomData: closedRoom }));
      showToast("ปิดห้องเรียบร้อยแล้ว", "success");
    } catch (e) {
      console.error("Error closing room:", e);
      showToast("ไม่สามารถปิดห้องได้", "error");
    }
  };

  const copyRoomCode = () => {
    if (!gameState.currentRoomId) return;
    navigator.clipboard
      .writeText(gameState.currentRoomId)
      .then(() => showToast("คัดลอกรหัสห้องแล้ว", "success"));
  };

  const resetGameFunc = async () => {
    if (gameState.sessionType === "solo") {
      startSoloMode();
      return;
    }
    if (!gameState.currentRoomId || !gameState.userId) return;
    try {
      const roomData = await resetGame(
        gameState.currentRoomId,
        gameState.userId
      );
      setGameState((prev) => ({ ...prev, currentRoomData: roomData }));
      showToast("รีเซ็ตเกมแล้ว", "success");
    } catch (error) {
      console.error("Error resetting game:", error);
      showToast("ไม่สามารถรีเซ็ตเกมได้", "error");
    }
  };

  const handleRoomCodeChange = (value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 6);
    setRoomCodeInput(sanitized);
    if (sanitized.length === 6) {
      setTimeout(() => joinRoomFunc(sanitized), 300);
    }
  };

  const resetProfile = () => {
    localStorage.clear();
    window.location.reload();
  };

  const renderCurrentScreen = () => {
    switch (gameState.currentScreen) {
      case "loading":
        return (
          <div className="fixed inset-0 z-[60] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center transition-opacity">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <div
                className="absolute inset-0 w-20 h-20 border-4 border-cyan-500/20 border-b-cyan-400 rounded-full animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1.5s",
                }}
              ></div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <i className="fas fa-bomb text-2xl text-blue-500 animate-pulse"></i>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Chat Bomb
                </h2>
              </div>
              <p className="text-blue-400/80 text-sm tracking-[0.3em] font-semibold uppercase animate-pulse">
                Loading...
              </p>
            </div>
          </div>
        );
      case "name":
        return (
          <NameScreen
            playerName={playerNameInput}
            onNameChange={setPlayerNameInput}
            onSubmit={enterWithName}
          />
        );
      case "lobby":
        return (
          <LobbyScreen
            playerName={gameState.playerName}
            roomCode={roomCodeInput}
            onRoomCodeChange={handleRoomCodeChange}
            onCreateRoom={createRoomFunc}
            onJoinRoom={() => joinRoomFunc()}
            onResetProfile={resetProfile}
            onStartSolo={startSoloMode}
          />
        );
      case "game":
        if (
          !gameState.currentRoomId ||
          !gameState.currentRoomData ||
          !gameState.userId
        ) {
          return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm font-medium">
                กำลังโหลดห้อง...
              </p>
            </div>
          );
        }
        return (
          <GameScreenComponent
            roomId={gameState.currentRoomId}
            roomData={gameState.currentRoomData}
            userId={gameState.userId}
            chatInput={chatInput}
            onChatChange={setChatInput}
            onSendChat={sendChatMessage}
            onLeaveRoom={leaveRoom}
            onCopyRoomCode={copyRoomCode}
            onOpenSetupModal={openSetupModal}
            showSetupModal={showSetupModal}
            onCloseSetupModal={() => setShowSetupModal(false)}
            bombWordInput={bombWordInput}
            hintInput={hintInput}
            onBombWordChange={setBombWordInput}
            onHintChange={setHintInput}
            onConfirmSetup={setBombWord}
            showConfirmModal={showConfirmModal}
            onOpenConfirmModal={() => setShowConfirmModal(true)}
            onCloseConfirmModal={() => setShowConfirmModal(false)}
            onConfirmCloseRoom={confirmCloseRoom}
            chatBoxRef={chatBoxRef}
            onResetGame={
              gameState.sessionType === "multiplayer"
                ? resetGameFunc
                : undefined
            }
            autoReturnCountdown={autoReturnCountdown}
            roundTimeLeft={roundTimeLeft}
            isSoloMode={gameState.sessionType === "solo"}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-screen gap-4">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-medium">กำลังโหลด...</p>
          </div>
        );
    }
  };

  return (
    <>
      <div
        id="toast-container"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-2rem)]"
      ></div>
      {isCreatingRoom && (
        <div className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center gap-6 transition-opacity">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div
              className="absolute inset-0 w-20 h-20 border-4 border-cyan-500/20 border-b-cyan-400 rounded-full animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.4s",
              }}
            ></div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-slate-200 text-lg font-semibold">
              กำลังสร้างห้องใหม่...
            </p>
            <p className="text-slate-400 text-sm">
              โปรดรอสักครู่ เพื่อหลีกเลี่ยงการสร้างห้องซ้ำ
            </p>
          </div>
        </div>
      )}
      {renderCurrentScreen()}
    </>
  );
}
