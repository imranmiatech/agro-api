const fs = require('fs');
const path = require('path');

const p = path.resolve('../admin/src/components/expertComponents/support/FarmerSupportDesk.tsx');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  `    try {
      await sendConsultationMessage({
        ticketId: activeTicket.id,
        sender: 'expert',
        senderName: expertName,
        senderRole: expertRole,
        text: replyText.trim(),
        attachments: previewImage ? [previewImage] : [],
        markResolved: markResolvedOnSend,
      }).unwrap();`,
  `    try {
      await sendConsultationMessage(payload).unwrap();`
);

fs.writeFileSync(p, c, 'utf8');
console.log('FarmerSupportDesk updated cleanly');
