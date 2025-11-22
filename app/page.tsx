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

const FETCH_DEBOUNCE_MS = 50; // Reduce debounce for faster updates
const ROUND_DURATION_MS = 10 * 60 * 1000;
const SOLO_TIME_LIMIT = 5 * 60 * 1000; // 5 minutes time limit to find the bomb word
const BOT_RESPONSE_DELAY = { min: 1200, max: 3000 };

// Solo Mode - Word Hunt Mechanics
const SOLO_WORD_HUNT_MECHANICS = {
  HINT_FREQUENCY: 0.20, // 20% chance bot gives helpful hint per message
  DIFFICULTY_PROGRESSION: 0.05, // Difficulty increases by 5% each turn
  DISCOVERY_BONUS: 1000, // Big bonus for finding the bomb word
  ATTEMPT_POINTS: 5, // Points for each word attempt
};

const SOLO_DIFFICULTY_PROGRESSION = {
  BEGINNER: { turns: 0, trapChance: 0.15, hintLevel: 0.8, responseSpeed: 0.8 },
  INTERMEDIATE: { turns: 10, trapChance: 0.20, hintLevel: 0.6, responseSpeed: 1.0 },
  ADVANCED: { turns: 20, trapChance: 0.25, hintLevel: 0.4, responseSpeed: 1.2 },
  EXPERT: { turns: 30, trapChance: 0.30, hintLevel: 0.2, responseSpeed: 1.4 }
};

const COMBO_MULTIPLIERS = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6]; // Word attempt streak multipliers
const POWER_UPS = {
  HINT_REVEAL: { cost: 80, description: "เผยคำใบ้เพิ่มเติม" },
  SLOW_TIME: { cost: 120, description: "ชะลอบอทลง 50%" },
  SHIELD: { cost: 200, description: "ป้องกันคำซ้ำ 1 ครั้ง" },
  WORD_SCANNER: { cost: 150, description: "วิเคราะห์คำใบ้ให้ชัดเจน" }
};

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
      "ยินดีต้อนรับสู่ครัวของมาริโอ้! วันนี้ฉันอบของอร่อยไว้ ลองทายดูสิว่าอะไร?",
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
      "กินข้าวหรือยังลูก? ป้ากำลังตำของแซ่บอยู่ ลองทายดูสิว่าเมนูอะไร?",
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
      "บีบแตรทำไมนักหนา! ถนนเส้นนี้มันนรกชัดๆ ลองทายดูสิว่าปัญหาคืออะไร?",
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
    intro: "เฮ้พวก! มาเบิร์นไขมันกันหน่อย ลองทายดูสิว่าอะไรคือปัญหาของคนอยากผอม?",
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

interface SoloStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  bestScore: number;
  totalScore: number;
  averageScore: number;
  bestTime: number; // in seconds
  totalTime: number; // in seconds
  averageTime: number; // in seconds
  longestCombo: number;
  totalWordsFound: number;
  achievements: string[];
}

interface SoloSessionState {
  bombWord: string;
  hint: string;
  responses: string[];
  safeTurns: number;
  messageSeq: number;
  botName: string;
  // Enhanced escape mechanics
  score: number;
  combo: number;
  maxCombo: number;
  difficultyLevel: keyof typeof SOLO_DIFFICULTY_PROGRESSION;
  pressureLevel: number; // Increases over time, affects trap frequency
  powerUps: {
    hintReveal: number;
    slowTime: number;
    shield: number;
    wordScanner: number;
  };
  isSlowTime: boolean;
  shieldActive: boolean;
  streak: number;
  creativityBonus: number;
  trapWords: string[]; // Words the bot has used to try to trick player
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
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [roundTimeLeft, setRoundTimeLeft] = useState<number | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [pendingGameMode, setPendingGameMode] = useState<"solo" | "multiplayer" | null>(null);

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

  // Solo Mode Statistics Management
  const getSoloStats = useCallback((): SoloStats => {
    const saved = localStorage.getItem("chat_bomb_solo_stats");
    if (!saved) {
      const defaultStats: SoloStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        bestScore: 0,
        totalScore: 0,
        averageScore: 0,
        bestTime: 0,
        totalTime: 0,
        averageTime: 0,
        longestCombo: 0,
        totalWordsFound: 0,
        achievements: []
      };
      localStorage.setItem("chat_bomb_solo_stats", JSON.stringify(defaultStats));
      return defaultStats;
    }
    return JSON.parse(saved);
  }, []);

  const updateSoloStats = useCallback((gameResult: "win" | "lose", gameTime: number, score: number, maxCombo: number, wordsFound: number) => {
    const stats = getSoloStats();
    
    stats.gamesPlayed += 1;
    if (gameResult === "win") {
      stats.gamesWon += 1;
    }
    stats.winRate = (stats.gamesWon / stats.gamesPlayed) * 100;
    
    stats.totalScore += score;
    stats.averageScore = Math.floor(stats.totalScore / stats.gamesPlayed);
    if (score > stats.bestScore) {
      stats.bestScore = score;
    }
    
    stats.totalTime += gameTime;
    stats.averageTime = Math.floor(stats.totalTime / stats.gamesPlayed);
    if (gameResult === "win" && (stats.bestTime === 0 || gameTime < stats.bestTime)) {
      stats.bestTime = gameTime;
    }
    
    if (maxCombo > stats.longestCombo) {
      stats.longestCombo = maxCombo;
    }
    
    stats.totalWordsFound += wordsFound;
    
    localStorage.setItem("chat_bomb_solo_stats", JSON.stringify(stats));
    return stats;
  }, [getSoloStats]);

  const showToast = useCallback((message: string, type: ToastType = "info", isCombo = false) => {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    
    // Special styling for combo toasts
    const bgClass = isCombo && type === "success"
      ? "bg-gradient-to-r from-orange-600 via-red-500 to-pink-600 border-orange-400/50 shadow-orange-500/50"
      : type === "error"
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

    const comboAnimation = isCombo ? "animate-bounce" : "";
    const comboScale = isCombo ? "hover:scale-110" : "hover:scale-105";

    toast.className = `${bgClass} text-white px-5 py-4 rounded-2xl shadow-2xl transform transition-all duration-500 translate-x-full flex items-center gap-3 pointer-events-auto border-2 backdrop-blur-xl w-80 ${comboScale} ${comboAnimation}`;
    toast.innerHTML = `<div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><i class="fas ${icon} text-lg"></i></div><span class="text-sm font-semibold leading-tight">${message}</span>`;

    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove("translate-x-full"));

    // Combo toasts stay longer
    const duration = isCombo ? 4500 : 3500;
    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-x-full", "scale-95");
      setTimeout(() => toast.remove(), 500);
    }, duration);
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

  const showRulesAndStart = (gameMode: "solo" | "multiplayer") => {
    setPendingGameMode(gameMode);
    setShowRulesModal(true);
  };

  const proceedWithGame = () => {
    setShowRulesModal(false);
    
    if (pendingGameMode === "solo") {
      actualStartSoloMode();
    } else if (pendingGameMode === "multiplayer") {
      if (roomCodeInput.length === 6) {
        // Joining existing room with code
        actualJoinRoom(roomCodeInput);
      } else {
        // Creating new room (called from create room button)
        actualCreateRoom();
      }
    }
    setPendingGameMode(null);
  };

  const cancelRules = () => {
    setShowRulesModal(false);
    setPendingGameMode(null);
  };

  const createRoomFunc = async () => {
    showRulesAndStart("multiplayer");
  };

  const actualCreateRoom = async () => {
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
      
      // Monitor connection status
      realtimeChannel.subscribe((status, err) => {
        console.log(`📡 Realtime status for room ${roomId}: ${status}`, err);
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          console.info(`✅ Realtime connected for room ${roomId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeConnected(false);
          console.warn(`⚠️ Realtime disconnected for room ${roomId}:`, status, err);
        }
      });
      
      unsubscribeRoomListener.current = {
        unsubscribe: () => {
          realtimeChannel.unsubscribe();
          setRealtimeConnected(false);
        },
      } as any;
    } else {
      console.warn("⚠️ Realtime unavailable. Falling back to polling every 3s");
      setRealtimeConnected(false);
      const pollInterval = setInterval(() => {
        fetchSnapshot(false);
      }, 3000);

      unsubscribeRoomListener.current = {
        unsubscribe: () => clearInterval(pollInterval),
      } as any;
    }
  };

  const getDifficultyLevel = (turns: number): keyof typeof SOLO_DIFFICULTY_PROGRESSION => {
    if (turns >= SOLO_DIFFICULTY_PROGRESSION.EXPERT.turns) return 'EXPERT';
    if (turns >= SOLO_DIFFICULTY_PROGRESSION.ADVANCED.turns) return 'ADVANCED';
    if (turns >= SOLO_DIFFICULTY_PROGRESSION.INTERMEDIATE.turns) return 'INTERMEDIATE';
    return 'BEGINNER';
  };

  const addSoloBotMessage = () => {
    const session = soloSessionRef.current;
    if (!session || session.isSlowTime) return;

    const nowIso = new Date().toISOString();
    const difficulty = SOLO_DIFFICULTY_PROGRESSION[session.difficultyLevel];
    
    // Smart bot behavior based on difficulty
    let messageTemplate;
    const randomValue = Math.random();
    
    if (randomValue < difficulty.hintLevel) {
      // Give helpful hints based on hintLevel (higher = more helpful)
      const helpfulHints = [
        `คำใบ้ใหม่: ${session.hint}`,
        `คำนี้มี ${session.bombWord.length} ตัวอักษร`,
        `เริ่มต้นด้วย "${session.bombWord.charAt(0).toUpperCase()}"`,
        `ลองคิดดู... ${session.hint.slice(0, 10)}...`
      ];
      messageTemplate = helpfulHints[Math.floor(Math.random() * helpfulHints.length)];
    } else if (randomValue < difficulty.hintLevel + difficulty.trapChance) {
      // Try to mislead player (higher difficulty = more traps)
      const misleadingMessages = [
        "คิดได้แล้ว? หรือยังงงอยู่?",
        "ระวังนะ อย่าพูดคำผิด!",
        "มันง่ายกว่าที่คิดนะ... หรือไม่?",
        "ฉันรู้ว่าคุณรู้คำตอบแล้ว!"
      ];
      messageTemplate = misleadingMessages[Math.floor(Math.random() * misleadingMessages.length)];
      
      // Track trap attempts
      session.trapWords.push(messageTemplate);
    } else {
      // Use regular responses
      const templateIndex = session.safeTurns % session.responses.length;
      messageTemplate = session.responses[templateIndex] ?? "ฉันยังรอให้คุณเผลออยู่เลยนะ";
    }
    
    const rendered = messageTemplate
      .replace("{hint}", session.hint)
      .replace("{length}", session.bombWord.length.toString())
      .replace("{score}", session.score.toString())
      .replace("{combo}", session.combo.toString());

    const messageId = session.messageSeq++;
    const botMessage = {
      id: messageId,
      room_id: "SOLO",
      sender_id: "solo-bot",
      sender_name: `${session.botName} [Lv.${session.difficultyLevel}]`,
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
    const session = soloSessionRef.current;
    if (!session) return;
    
    clearSoloBotTimer();
    
    // Dynamic response timing based on difficulty
    const difficulty = SOLO_DIFFICULTY_PROGRESSION[session.difficultyLevel];
    const baseDelay = BOT_RESPONSE_DELAY.min + 
      Math.random() * (BOT_RESPONSE_DELAY.max - BOT_RESPONSE_DELAY.min);
    const adjustedDelay = baseDelay / difficulty.responseSpeed;
    
    soloBotTimeoutRef.current = setTimeout(() => {
      addSoloBotMessage();
    }, adjustedDelay);
  };

  const completeSoloRound = (result: "success" | "fail") => {
    const sessionSnapshot = soloSessionRef.current;
    clearSoloBotTimer();
    
    // Calculate game statistics before clearing session
    if (sessionSnapshot) {
      const gameStartTime = new Date(gameState.currentRoomData?.room.round_started_at || Date.now()).getTime();
      const gameTime = Math.floor((Date.now() - gameStartTime) / 1000);
      const wordsFound = sessionSnapshot.safeTurns;
      
      // Update statistics
      const updatedStats = updateSoloStats(
        result === "success" ? "win" : "lose",
        gameTime,
        sessionSnapshot.score,
        sessionSnapshot.maxCombo,
        wordsFound
      );
      
      // Achievement checks
      const newAchievements: string[] = [];
      if (result === "success" && !updatedStats.achievements.includes("first_win")) {
        newAchievements.push("first_win");
        showToast("🏆 Achievement: First Victory!", "success");
      }
      if (sessionSnapshot.maxCombo >= 5 && !updatedStats.achievements.includes("combo_master")) {
        newAchievements.push("combo_master");
        showToast("🔥 Achievement: Combo Master!", "success");
      }
      if (result === "success" && gameTime < 120 && !updatedStats.achievements.includes("speed_runner")) {
        newAchievements.push("speed_runner");
        showToast("⚡ Achievement: Speed Runner!", "success");
      }
      if (result === "success" && sessionSnapshot.combo === sessionSnapshot.safeTurns && !updatedStats.achievements.includes("perfect_game")) {
        newAchievements.push("perfect_game");
        showToast("💎 Achievement: Perfect Game!", "success");
      }
      
      // Save new achievements
      if (newAchievements.length > 0) {
        const stats = getSoloStats();
        stats.achievements = [...stats.achievements, ...newAchievements];
        localStorage.setItem("chat_bomb_solo_stats", JSON.stringify(stats));
      }
    }
    
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
          message_text: "🎉 คุณหาคำระเบิดเจอแล้ว! ยินดีด้วย!",
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
      const bonusScore = (sessionSnapshot?.safeTurns ?? 0) * 50;
      const finalScore = (sessionSnapshot?.score ?? 0) + bonusScore;
      const maxCombo = sessionSnapshot?.maxCombo ?? 0;
      showToast(
        `🎉 ชนะแล้ว! คะแนนสุดท้าย: ${finalScore} | Max Combo: ${maxCombo}x | Victory Bonus: +${bonusScore}`,
        "success"
      );
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
    
    // In solo mode, finding the bomb word is the GOAL (not elimination)
    const isSuccess = isBoom;
    let shouldEliminate = isDuplicate && !isSuccess; // Only duplicate words eliminate, not bomb word
    
    // Shield power-up protects from elimination
    if (shouldEliminate && session.shieldActive) {
      session.shieldActive = false;
      session.powerUps.shield = Math.max(0, session.powerUps.shield - 1);
      shouldEliminate = false;
      showToast("�️ Shield Protected! คุณรอดไปแล้ว!", "success");
    }

    const nowIso = new Date().toISOString();
    const messageId = session.messageSeq++;

    // Handle bomb word found (SUCCESS!)
    if (isSuccess) {
      const finalScore = session.score + 1000; // Big bonus for finding bomb word
      const maxCombo = session.maxCombo;
      
      const playerMessage: DbMessage = {
        id: messageId,
        room_id: "SOLO",
        sender_id: gameState.userId,
        sender_name: `${gameState.playerName} [${finalScore}pts]`,
        message_text: text,
        is_boom: false, // Success, not elimination
        created_at: nowIso,
      };

      setGameState((prev) => {
        if (!prev.currentRoomData) return prev;
        const updatedRoom: DbRoom = { 
          ...prev.currentRoomData.room, 
          status: "CLOSED", 
          updated_at: nowIso 
        };
        return {
          ...prev,
          currentRoomData: {
            ...prev.currentRoomData,
            room: updatedRoom,
            messages: [...(prev.currentRoomData.messages ?? []), playerMessage],
          },
        };
      });

      setChatInput("");
      showToast(`🎉 เจอแล้ว! "${text}" คือคำระเบิด! +1000 คะแนน`, "success");
      completeSoloRound("success");
      return;
    }

    // Calculate score for non-bomb words
    if (!shouldEliminate) {
      session.combo++;
      session.streak++;
      session.maxCombo = Math.max(session.maxCombo, session.combo);
      
      const comboMultiplier = COMBO_MULTIPLIERS[Math.min(session.combo - 1, COMBO_MULTIPLIERS.length - 1)];
      const baseScore = 5 + (session.safeTurns * 1); // Lower base score for regular words
      let earnedScore = Math.floor(baseScore * comboMultiplier);
      
      // Creativity bonus for unique words
      if (session.creativityBonus > 0) {
        earnedScore = Math.floor(earnedScore * (1 + session.creativityBonus * 0.1));
      }
      
      session.score += earnedScore;
      
      // Update difficulty level
      const oldDifficulty = session.difficultyLevel;
      session.difficultyLevel = getDifficultyLevel(session.safeTurns);
      
      // Notify when difficulty increases
      if (oldDifficulty !== session.difficultyLevel) {
        showToast(`⚡ ระดับความยากเพิ่มขึ้น: ${session.difficultyLevel}!`, "info");
      }
      
      // Enhanced combo visual feedback
      if (session.combo > 1) {
        const comboEmoji = session.combo >= 10 ? "🌟" : 
                          session.combo >= 7 ? "💥" : 
                          session.combo >= 5 ? "⚡" : 
                          session.combo >= 3 ? "🔥" : "✨";
        
        const comboTitle = session.combo >= 10 ? "LEGENDARY" :
                          session.combo >= 7 ? "AMAZING" :
                          session.combo >= 5 ? "FANTASTIC" :
                          session.combo >= 3 ? "GREAT" : "NICE";
        
        showToast(`${comboEmoji} ${comboTitle} ${session.combo}x Combo! +${earnedScore} คะแนน`, "success", true);
      }
    } else {
      // Combo break notification
      if (session.combo > 2) {
        showToast(`💔 Combo Break! (จาก ${session.combo}x)`, "error");
      }
      session.combo = 0; // Reset combo on failure
    }

    const playerMessage: DbMessage = {
      id: messageId,
      room_id: "SOLO",
      sender_id: gameState.userId,
      sender_name: `${gameState.playerName} [${session.score}pts]`,
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
      const finalScore = session.score;
      const maxCombo = session.maxCombo;
      showToast(
        `Game Over! พูดคำซ้ำ คะแนนสุดท้าย: ${finalScore} | Max Combo: ${maxCombo}x`,
        "error"
      );
      completeSoloRound("fail");
      return;
    }

    session.safeTurns += 1;

    // Random power-up drops (2% chance per turn)
    if (Math.random() < 0.02) {
      const powerUpTypes = Object.keys(POWER_UPS) as Array<keyof typeof POWER_UPS>;
      const randomPowerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      
      if (randomPowerUp === 'SHIELD') {
        session.powerUps.shield++;
        session.shieldActive = true;
        showToast("�️ Shield Power-up! ป้องกันการโดนออกครั้งถัดไป", "success");
      } else if (randomPowerUp === 'SLOW_TIME') {
        session.isSlowTime = true;
        session.powerUps.slowTime++;
        showToast("⏰ Slow Time! บอทตอบช้าลงชั่วคราว", "success");
      } else if (randomPowerUp === 'HINT_REVEAL') {
        session.powerUps.hintReveal++;
        showToast("💡 Hint Reveal! เผยคำใบ้เพิ่มเติม", "success");
      } else if (randomPowerUp === 'WORD_SCANNER') {
        session.powerUps.wordScanner++;
        showToast("🔍 Word Scanner! ตรวจจับคำอันตราย", "success");
      }
    }

    // Continue the conversation - let bot respond
    scheduleSoloBotResponse();
  };

  const startSoloMode = () => {
    showRulesAndStart("solo");
  };

  const actualStartSoloMode = () => {
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
      // Enhanced game mechanics
      score: 0,
      combo: 0,
      maxCombo: 0,
      difficultyLevel: 'BEGINNER',
      pressureLevel: 0,
      powerUps: {
        hintReveal: 0,
        slowTime: 0,
        shield: 1, // Start with 1 free shield
        wordScanner: 0,
      },
      isSlowTime: false,
      shieldActive: true,
      streak: 0,
      creativityBonus: 0,
      trapWords: [],
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
    setRoundTimeLeft(Math.floor(SOLO_TIME_LIMIT / 1000));
    showToast(`เริ่มหาคำระเบิด! บอท: ${preset.botName}`, "info");
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

    const endTime = new Date(roundStart).getTime() + (gameState.sessionType === "solo" ? SOLO_TIME_LIMIT : ROUND_DURATION_MS);

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRoundTimeLeft(diff);
      
      // Show time warnings for solo mode
      if (gameState.sessionType === "solo" && diff > 0) {
        if (diff === 60) {
          showToast("⚠️ เหลือเวลาอีก 1 นาที! รีบหาคำระเบิดให้เจอ", "info");
        } else if (diff === 30) {
          showToast("🚨 เหลือเวลาอีก 30 วินาที! เร่งด่วน!", "error");
        }
      }
      
      if (diff <= 0 && roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
        roundTimerRef.current = null;
        
        // Auto-end game when time is up
        if (gameState.sessionType === "solo") {
          // Solo mode: time up = fail
          completeSoloRound("fail");
          showToast("⏰ หมดเวลาแล้ว! คุณไม่สามารถหาคำระเบิดได้ทันเวลา", "error");
        } else {
          // Multiplayer mode: existing auto-close logic
          // This is handled by backend
        }
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

    // Show rules before joining multiplayer room
    if (code) {
      setPendingGameMode("multiplayer");
      setRoomCodeInput(code);
      setShowRulesModal(true);
    }
  };

  const actualJoinRoom = async (code: string) => {
    try {
      await addPlayerToRoom(code, gameState.userId!, gameState.playerName!);
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
            soloStats={getSoloStats()}
            onShowRules={(gameMode) => {
              setPendingGameMode(gameMode);
              // Clear room code when just viewing rules
              if (gameMode === "multiplayer") {
                setRoomCodeInput("");
              }
              setShowRulesModal(true);
            }}
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
            realtimeConnected={realtimeConnected}
            soloStats={gameState.sessionType === "solo" && soloSessionRef.current ? {
              score: soloSessionRef.current.score || 0,
              combo: soloSessionRef.current.combo || 0,
              maxCombo: soloSessionRef.current.maxCombo || 0,
              difficultyLevel: soloSessionRef.current.difficultyLevel || 'BEGINNER',
              pressureLevel: soloSessionRef.current.pressureLevel || 0,
              powerUps: soloSessionRef.current.powerUps || {
                hintReveal: 0,
                slowTime: 0,
                shield: 0,
                wordScanner: 0
              },
              shieldActive: soloSessionRef.current.shieldActive || false,
              isSlowTime: soloSessionRef.current.isSlowTime || false,
              creativityBonus: soloSessionRef.current.creativityBonus || 0
            } : undefined}
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

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[95] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <i className="fas fa-book-open text-white text-lg"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      กติกาการเล่น
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {pendingGameMode === "solo" 
                        ? "โหมดเล่นคนเดียว - หาคำระเบิด" 
                        : roomCodeInput.length === 6 
                          ? `โหมดเล่นหลายคน - เข้าร่วมห้อง ${roomCodeInput}`
                          : "โหมดเล่นหลายคน - หลีกเลี่ยงคำระเบิด"
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancelRules}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-200 flex items-center justify-center border border-slate-600/50 hover:border-red-400/50"
                  title="ยกเลิก (ไม่เข้าเล่นเกม)"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {pendingGameMode === "solo" ? (
                <div className="space-y-6">
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
                      <h3 className="text-lg font-semibold text-green-300">สำคัญ! โหมดเล่นคนเดียวแตกต่างจากเล่นกลุ่ม</h3>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-green-200 text-sm leading-relaxed">
                        <strong>โหมดเล่นคนเดียว:</strong> คำระเบิดคือ <strong className="text-green-300">เป้าหมาย</strong> ที่คุณต้องหา 
                        เมื่อพูดคำระเบิดถูก = <strong className="text-green-300">ชนะเกม!</strong>
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
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
                          <span className="text-slate-300">บอทจะให้คำใบ้เกี่ยวกับคำระเบิด</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-blue-400 text-xs font-bold">2</span>
                          </div>
                          <span className="text-slate-300">คุณลองพูดคำต่างๆ เพื่อค้นหาคำระเบิด</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-trophy text-green-400 text-xs"></i>
                          </div>
                          <span className="text-slate-300">พูด<strong className="text-green-400">คำระเบิดถูกต้อง</strong> = <strong className="text-green-400">ชนะ! +1000 คะแนน</strong></span>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-times text-red-400 text-xs"></i>
                          </div>
                          <span className="text-slate-300">พูด<strong className="text-red-400">คำซ้ำ</strong> = <strong className="text-red-400">แพ้</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-magic text-purple-400"></i>
                        พาวเวอร์อัพ
                      </h3>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-shield-alt text-blue-400"></i>
                          <span className="text-slate-300"><strong>Shield:</strong> ป้องกันคำซ้ำ 1 ครั้ง</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-lightbulb text-yellow-400"></i>
                          <span className="text-slate-300"><strong>Hint Reveal:</strong> เผยคำใบ้เพิ่มเติม</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-clock text-purple-400"></i>
                          <span className="text-slate-300"><strong>Slow Time:</strong> ชะลอบอทลง 50%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-search text-cyan-400"></i>
                          <span className="text-slate-300"><strong>Word Scanner:</strong> วิเคราะห์คำใบ้</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-400/30">
                      <div className="flex items-start gap-3">
                        <i className="fas fa-clock text-amber-400 text-lg mt-1"></i>
                        <div>
                          <h4 className="font-semibold text-amber-300 mb-1">เวลาจำกัด</h4>
                          <p className="text-amber-200/80 text-sm">คุณมีเวลา <strong>5 นาที</strong> ในการหาคำระเบิด</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl p-4 border border-emerald-400/30">
                      <h4 className="font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                        <i className="fas fa-balance-scale text-emerald-400"></i>
                        เปรียบเทียบกับโหมดเล่นกลุ่ม
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-green-300 font-semibold mb-1">👤 เล่นคนเดียว</div>
                          <div className="text-green-200">คำระเบิด = เป้าหมาย</div>
                          <div className="text-green-200">พูดคำระเบิด = ชนะ ✅</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-red-300 font-semibold mb-1">👥 เล่นกลุ่ม</div>
                          <div className="text-red-200">คำระเบิด = อันตราย</div>
                          <div className="text-red-200">พูดคำระเบิด = แพ้ ❌</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
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
                        <i className="fas fa-exclamation-triangle text-red-400"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-red-300">สำคัญ! โหมดเล่นกลุ่มแตกต่างจากเล่นคนเดียว</h3>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-red-200 text-sm leading-relaxed">
                        <strong>โหมดเล่นหลายคน:</strong> คำระเบิดคือ <strong className="text-red-300">อันตราย</strong> ที่ต้องหลีกเลี่ยง 
                        เมื่อพูดคำระเบิด = <strong className="text-red-300">แพ้ทันที!</strong>
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
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
                          <span className="text-slate-300">ผู้เล่นคุยกันโดย<strong className="text-red-400"> ห้ามพูดคำระเบิด</strong></span>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-skull text-red-400 text-xs"></i>
                          </div>
                          <span className="text-slate-300">พูด<strong className="text-red-400">คำระเบิด</strong> หรือ <strong className="text-red-400">คำซ้ำ</strong> = <strong className="text-red-400">ตกรอบทันที</strong></span>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-trophy text-green-400 text-xs"></i>
                          </div>
                          <span className="text-slate-300">รอด<strong className="text-green-400">ครบ 10 นาที</strong> = <strong className="text-green-400">ชนะ!</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/30">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <i className="fas fa-users text-green-400"></i>
                        บทบาทผู้เล่น
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-crown text-yellow-400 text-sm"></i>
                          </div>
                          <div>
                            <h4 className="font-semibold text-yellow-300">เจ้าของห้อง</h4>
                            <p className="text-slate-400 text-sm">ตั้งคำระเบิดและคำใบ้ (ไม่ได้เล่น)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-user text-blue-400 text-sm"></i>
                          </div>
                          <div>
                            <h4 className="font-semibold text-blue-300">ผู้เล่น</h4>
                            <p className="text-slate-400 text-sm">พยายามรอดชีวิตโดยไม่พูดคำระเบิด</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-2xl p-4 border border-red-400/30">
                      <div className="flex items-start gap-3">
                        <i className="fas fa-exclamation-triangle text-red-400 text-lg mt-1"></i>
                        <div>
                          <h4 className="font-semibold text-red-300 mb-1">ข้อควรระวัง</h4>
                          <ul className="text-red-200/80 text-sm space-y-1">
                            <li>• พูดคำระเบิด = โดนออกทันที</li>
                            <li>• พูดคำซ้ำ = โดนออกทันที</li>
                            <li>• ผู้เล่นที่โดนออกแล้วดูได้แต่พูดไม่ได้</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl p-4 border border-cyan-400/30">
                      <h4 className="font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                        <i className="fas fa-balance-scale text-cyan-400"></i>
                        เปรียบเทียบกับโหมดเล่นคนเดียว
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-red-300 font-semibold mb-1">👥 เล่นกลุ่ม</div>
                          <div className="text-red-200">คำระเบิด = อันตราย</div>
                          <div className="text-red-200">พูดคำระเบิด = แพ้ ❌</div>
                          <div className="text-red-200">เป้าหมาย: หลีกเลี่ยง</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-green-300 font-semibold mb-1">👤 เล่นคนเดียว</div>
                          <div className="text-green-200">คำระเบิด = เป้าหมาย</div>
                          <div className="text-green-200">พูดคำระเบิด = ชนะ ✅</div>
                          <div className="text-green-200">เป้าหมาย: ค้นหา</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-700/50">
              <button
                onClick={proceedWithGame}
                className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <i className="fas fa-check-circle"></i>
                <span>
                  {pendingGameMode === "solo" 
                    ? "เข้าใจแล้ว เริ่มหาคำระเบิด!" 
                    : roomCodeInput.length === 6 
                      ? `เข้าใจแล้ว เข้าร่วมห้อง ${roomCodeInput}!`
                      : "เข้าใจแล้ว สร้างห้องใหม่!"
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {renderCurrentScreen()}
    </>
  );
}
