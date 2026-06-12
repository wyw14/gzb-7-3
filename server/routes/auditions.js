const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/storage');

const router = express.Router();

router.get('/', (req, res) => {
  const auditions = readJSON('auditions.json', []);
  const users = readJSON('users.json', []);
  const instruments = readJSON('instruments.json', []);
  const { requesterId, ownerId, instrumentId, status, currentUserId } = req.query;
  
  let result = auditions;
  
  if (requesterId) {
    result = result.filter(a => a.requesterId === requesterId);
  }
  if (ownerId) {
    result = result.filter(a => a.ownerId === ownerId);
  }
  if (instrumentId) {
    result = result.filter(a => a.instrumentId === instrumentId);
  }
  if (status) {
    result = result.filter(a => a.status === status);
  }
  
  const enriched = result.map(aud => {
    return {
      ...aud,
      requester: users.find(u => u.id === aud.requesterId) || null,
      owner: users.find(u => u.id === aud.ownerId) || null,
      instrument: instruments.find(i => i.id === aud.instrumentId) || null
    };
  });
  
  res.json(enriched);
});

router.get('/user/:userId', (req, res) => {
  const auditions = readJSON('auditions.json', []);
  const users = readJSON('users.json', []);
  const instruments = readJSON('instruments.json', []);
  const { userId } = req.params;
  
  const result = auditions.filter(a => 
    a.requesterId === userId || a.ownerId === userId
  );
  
  const enriched = result.map(aud => {
    return {
      ...aud,
      requester: users.find(u => u.id === aud.requesterId) || null,
      owner: users.find(u => u.id === aud.ownerId) || null,
      instrument: instruments.find(i => i.id === aud.instrumentId) || null
    };
  });
  
  res.json(enriched);
});

router.post('/', (req, res) => {
  const auditions = readJSON('auditions.json', []);
  
  const newAudition = {
    id: 'aud' + uuidv4().slice(0, 8),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  auditions.push(newAudition);
  writeJSON('auditions.json', auditions);
  
  res.json({ success: true, audition: newAudition });
});

router.put('/:id', (req, res) => {
  const auditions = readJSON('auditions.json', []);
  const idx = auditions.findIndex(a => a.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ error: '试奏预约不存在' });
  }
  
  const newStatus = req.body.status;
  const oldStatus = auditions[idx].status;
  
  auditions[idx] = { 
    ...auditions[idx], 
    ...req.body, 
    id: auditions[idx].id,
    repliedAt: (newStatus && newStatus !== 'pending' && newStatus !== 'completed')
      ? (auditions[idx].repliedAt || new Date().toISOString())
      : auditions[idx].repliedAt,
    completedAt: newStatus === 'completed' && oldStatus !== 'completed'
      ? new Date().toISOString()
      : auditions[idx].completedAt
  };
  
  writeJSON('auditions.json', auditions);
  res.json({ success: true, audition: auditions[idx] });
});

module.exports = router;
