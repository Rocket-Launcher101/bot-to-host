import fetch from 'node-fetch';
import axios from 'axios';
import { createReadStream, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const config = {
  name: "googlelens",
  aliases: ["glens"],
  description: "Fetches information about an image using Google Lens.",
  usage: "[reply to an image message]",
  cooldown: 3,
  permissions: [1, 2],
  credits: "Coffee",
};

const boldFontMap = {
  ' ': ' ',
  'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡',
  'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪',
  'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
  'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇',
  'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐',
  'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
};

const toBoldFont = (text) => {
  return text.split('').map(char => boldFontMap[char] || char).join('');
};

const fetchGoogleLensData = async (imageUrl) => {
  const apiUrl = `https://deku-rest-apis.ooguy.com/api/glens?url=${encodeURIComponent(imageUrl)}`;

  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error("⚠️ Failed to fetch data");

  const { status, data } = await response.json();
  if (!status || !data.length) throw new Error("⚠️ No results found.");

  return data.slice(0, 6); // Limit results to 6
};

const downloadImageAsStream = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const path = `${__dirname}/cache/${Math.random().toString(36).substr(2, 9)}.jpg`;
  writeFileSync(path, response.data);
  return createReadStream(path);
};

const onCall = async ({ message }) => {
  const { messageReply } = message; // Get the replied message
  const { attachments } = messageReply || {};

  if (!attachments || !attachments.length || !["photo", "sticker"].includes(attachments[0]?.type)) {
    await message.reply("⚠️ No image found in the replied message.");
    return;
  }

  const imageUrl = attachments[0].url; // Extract the image URL

  try {
    await message.react("🕰️"); // Indicate processing
    const results = await fetchGoogleLensData(imageUrl);

    const imgData = [];
    for (let i = 0; i < results.length; i++) {
      const imageBuffer = await downloadImageAsStream(results[i].thumbnail);
      imgData.push(imageBuffer);
    }

    const replyMessages = results.map(item => 
      `${toBoldFont("Title:")} ${item.title}\n${toBoldFont("Source:")} ${item.source}\n${toBoldFont("Link:")} [View](${item.link})`
    ).join("\n\n");

    await message.react("✔️"); // React with ✔️ on success
    message.send({
      attachment: imgData,
      body: replyMessages
    });

  } catch (error) {
    console.error(error);
    await message.react("✖️"); // React with ✖️ on error
    await message.reply("⚠️ An error occurred while fetching the data.");
  } finally {
    for (let i = 0; i < imgData.length; i++) {
      const filePath = `${__dirname}/cache/${Math.random().toString(36).substr(2, 9)}.jpg`;
      try {
        unlinkSync(filePath);
      } catch (error) {
        console.error(`[ERROR] Failed to delete cache file: ${filePath}\n`, error);
      }
    }
  }
};

export default {
  config,
  onCall
};
