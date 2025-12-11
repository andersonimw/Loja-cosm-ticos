const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar Firebase com variáveis de ambiente
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configurar upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// ===== ROTAS CLIENTES =====

app.post('/api/clientes', async (req, res) => {
  try {
    const cliente = req.body;
    const docRef = await db.collection('clientes').add({
      ...cliente,
      dataCadastro: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const snapshot = await db.collection('clientes').orderBy('dataCadastro', 'desc').get();
    const clientes = [];
    snapshot.forEach(doc => {
      clientes.push({ id: doc.id, ...doc.data() });
    });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS PRODUTOS =====

app.post('/api/produtos', upload.single('imagem'), async (req, res) => {
  try {
    const { nome, descricao, preco, estoque } = req.body;
    const imagemUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const docRef = await db.collection('produtos').add({
      nome,
      descricao,
      preco: parseFloat(preco),
      estoque: parseInt(estoque),
      imagemUrl,
      dataCriacao: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/produtos', async (req, res) => {
  try {
    const snapshot = await db.collection('produtos').get();
    const produtos = [];
    snapshot.forEach(doc => {
      produtos.push({ id: doc.id, ...doc.data() });
    });
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/produtos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, preco, estoque } = req.body;
    
    await db.collection('produtos').doc(id).update({
      nome,
      descricao,
      preco: parseFloat(preco),
      estoque: parseInt(estoque)
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/produtos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('produtos').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ROTAS PEDIDOS =====

app.post('/api/pedidos', async (req, res) => {
  try {
    const pedido = req.body;
    const docRef = await db.collection('pedidos').add({
      ...pedido,
      status: 'pendente',
      dataPedido: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/pedidos', async (req, res) => {
  try {
    const snapshot = await db.collection('pedidos').orderBy('dataPedido', 'desc').get();
    const pedidos = [];
    snapshot.forEach(doc => {
      pedidos.push({ id: doc.id, ...doc.data() });
    });
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pedidos/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await db.collection('pedidos').doc(id).update({ status });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ESTATÍSTICAS =====

app.get('/api/estatisticas', async (req, res) => {
  try {
    const pedidosSnapshot = await db.collection('pedidos').get();
    const produtosSnapshot = await db.collection('produtos').get();
    const clientesSnapshot = await db.collection('clientes').get();
    
    let totalVendas = 0;
    let pedidosPendentes = 0;
    
    pedidosSnapshot.forEach(doc => {
      const pedido = doc.data();
      totalVendas += pedido.total || 0;
      if (pedido.status === 'pendente') pedidosPendentes++;
    });
    
    res.json({
      totalPedidos: pedidosSnapshot.size,
      totalVendas: totalVendas.toFixed(2),
      totalProdutos: produtosSnapshot.size,
      totalClientes: clientesSnapshot.size,
      pedidosPendentes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
