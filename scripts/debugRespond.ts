import { respondJoinRequestService } from '../lib/server/roomService';

const [,, requestId, ownerId, decisionInput] = process.argv;

if (!requestId || !ownerId || !decisionInput) {
  console.error('Usage: ts-node scripts/debugRespond.ts <requestId> <ownerId> <APPROVE|DENY>');
  process.exit(1);
}

const decision = decisionInput.toUpperCase() === 'APPROVE' ? 'APPROVE' : 'DENY';

(async () => {
  try {
    const result = await respondJoinRequestService(requestId, ownerId, decision);
    console.log('Success:', result);
  } catch (error) {
    console.error('Error executing respondJoinRequestService:', error);
  }
})();
