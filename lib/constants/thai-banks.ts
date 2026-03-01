export type ThaiBankOption = {
  code: string;
  nameTh: string;
  nameEn: string;
};

// Reference set based on banks operating in Thailand (BOT ecosystem).
export const THAI_BANK_OPTIONS: ThaiBankOption[] = [
  { code: "002", nameTh: "ธนาคารกรุงเทพ", nameEn: "Bangkok Bank" },
  { code: "004", nameTh: "ธนาคารกสิกรไทย", nameEn: "Kasikornbank" },
  { code: "006", nameTh: "ธนาคารกรุงไทย", nameEn: "Krung Thai Bank" },
  { code: "011", nameTh: "ธนาคารทหารไทยธนชาต", nameEn: "TMBThanachart Bank" },
  { code: "014", nameTh: "ธนาคารไทยพาณิชย์", nameEn: "Siam Commercial Bank" },
  { code: "017", nameTh: "ธนาคารซิตี้แบงก์", nameEn: "Citibank N.A." },
  { code: "018", nameTh: "ธนาคารซูมิโตโม มิตซุย แบงกิ้ง คอร์ปอเรชั่น", nameEn: "Sumitomo Mitsui Banking Corporation" },
  { code: "022", nameTh: "ธนาคารซีไอเอ็มบี ไทย", nameEn: "CIMB Thai Bank" },
  { code: "024", nameTh: "ธนาคารยูโอบี", nameEn: "United Overseas Bank (Thai)" },
  { code: "025", nameTh: "ธนาคารกรุงศรีอยุธยา", nameEn: "Bank of Ayudhya" },
  { code: "030", nameTh: "ธนาคารออมสิน", nameEn: "Government Savings Bank" },
  { code: "031", nameTh: "ธนาคารฮ่องกงและเซี่ยงไฮ้", nameEn: "HSBC Thailand" },
  { code: "033", nameTh: "ธนาคารอาคารสงเคราะห์", nameEn: "Government Housing Bank" },
  { code: "034", nameTh: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", nameEn: "Bank for Agriculture and Agricultural Cooperatives" },
  { code: "035", nameTh: "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย", nameEn: "Export-Import Bank of Thailand" },
  { code: "039", nameTh: "ธนาคารมิซูโฮ", nameEn: "Mizuho Bank" },
  { code: "045", nameTh: "ธนาคารบีเอ็นพี พารีบาส์", nameEn: "BNP Paribas" },
  { code: "052", nameTh: "ธนาคารแห่งประเทศจีน (ไทย)", nameEn: "Bank of China (Thai)" },
  { code: "066", nameTh: "ธนาคารอิสลามแห่งประเทศไทย", nameEn: "Islamic Bank of Thailand" },
  { code: "067", nameTh: "ธนาคารทิสโก้", nameEn: "TISCO Bank" },
  { code: "069", nameTh: "ธนาคารเกียรตินาคินภัทร", nameEn: "Kiatnakin Phatra Bank" },
  { code: "070", nameTh: "ธนาคารไอซีบีซี (ไทย)", nameEn: "ICBC (Thai) Bank" },
  { code: "071", nameTh: "ธนาคารไทยเครดิต", nameEn: "Thai Credit Bank" },
  { code: "073", nameTh: "ธนาคารแลนด์ แอนด์ เฮ้าส์", nameEn: "Land and Houses Bank" },
  { code: "098", nameTh: "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย", nameEn: "SME Development Bank" },
];
