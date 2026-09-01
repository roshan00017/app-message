/**
 * Database Seeder
 *
 * Seeds the database with users for local development:
 *   - 1 admin user
 *   - 6 agent users (with agent profiles and varied skills)
 *
 * Usage:
 *   pnpm --filter backend seed
 *   npx tsx apps/backend/src/seed.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import { config } from './config/env.js';

// ─── Types ──────────────────────────────────────────────────────

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'agent';
  avatar: string | null;
}

// ─── Seed Data ──────────────────────────────────────────────────

const USERS: SeedUser[] = [
  {
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'password123',
    role: 'admin',
    avatar: null,
  },
  {
    email: 'agent@example.com',
    name: 'Support Agent',
    password: 'password123',
    role: 'agent',
    avatar: null,
  },
  {
    email: 'sarah@example.com',
    name: 'Sarah Johnson',
    password: 'password123',
    role: 'agent',
    avatar: null,
  },
  {
    email: 'mike@example.com',
    name: 'Mike Chen',
    password: 'password123',
    role: 'agent',
    avatar: null,
  },
  {
    email: 'emma@example.com',
    name: 'Emma Davis',
    password: 'password123',
    role: 'agent',
    avatar: null,
  },
  {
    email: 'alex@example.com',
    name: 'Alex Rodriguez',
    password: 'password123',
    role: 'agent',
    avatar: null,
  },
  {
    email: 'lisa@example.com',
    name: 'Lisa Wang',
    password: 'password123',
    role: 'agent',
    avatar: null,
  },
];

// ─── Seeder ─────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB');

    // Get collections
    const db = mongoose.connection.db!;
    const usersCollection = db.collection('users');
    const agentsCollection = db.collection('agents');

    // Clear ALL existing data
    const conversationsCollection = db.collection('conversations');
    const messagesCollection = db.collection('messages');
    const sessionsCollection = db.collection('sessions');

    console.log('🗑️  Clearing existing data...');
    await usersCollection.deleteMany({});
    await agentsCollection.deleteMany({});
    await conversationsCollection.deleteMany({});
    await messagesCollection.deleteMany({});
    await sessionsCollection.deleteMany({});

    // Create users with hashed passwords
    console.log('👤 Creating users...');
    const createdUsers: any[] = [];

    for (const userData of USERS) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const result = await usersCollection.insertOne({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
        avatar: userData.avatar,
        status: 'offline',
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      createdUsers.push({
        ...userData,
        _id: result.insertedId,
      });

      console.log(`   ✓ ${userData.name} (${userData.role}) — ${userData.email}`);
    }

    // Create agent profiles for all agent users
    console.log('\n🧑‍💼 Creating agent profiles...');
    const agentSkills: Record<string, string[]> = {
      'agent@example.com': ['general', 'billing'],
      'sarah@example.com': ['technical', 'general'],
      'mike@example.com': ['billing', 'accounts'],
      'emma@example.com': ['technical', 'escalation'],
      'alex@example.com': ['general', 'shipping'],
      'lisa@example.com': ['technical', 'billing', 'escalation'],
    };

    const agentUsers = createdUsers.filter((u) => u.role === 'agent');

    for (const agentUser of agentUsers) {
      const skills = agentSkills[agentUser.email] || ['general'];
      await agentsCollection.insertOne({
        userId: agentUser._id,
        skills,
        maxConcurrentChats: 5,
        currentChats: 0,
        isAvailable: true,
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`   ✓ Agent profile for ${agentUser.name} — skills: ${skills.join(', ')}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('   ─────────────────────────────────────');
    console.log('   Admin:   admin@example.com   / password123');
    console.log('   Agent:   agent@example.com   / password123');
    console.log('   Agent:   sarah@example.com   / password123');
    console.log('   Agent:   mike@example.com    / password123');
    console.log('   Agent:   emma@example.com    / password123');
    console.log('   Agent:   alex@example.com    / password123');
    console.log('   Agent:   lisa@example.com    / password123');
    console.log('   ─────────────────────────────────────\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
