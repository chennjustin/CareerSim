/**
 * Firestore 数据初始化脚本
 * 
 * 使用方法：
 * 1. 安装依赖：npm install firebase-admin
 * 2. 配置 Firebase Admin SDK（需要服务账号密钥文件）
 * 3. 运行脚本：
 *    - node firestore-init.js --projectId=your-project-id --keyFile=path/to/key.json
 *    - 或设置环境变量后运行：node firestore-init.js
 * 
 * 配置方式（按优先级）：
 * 1. 命令行参数：--projectId 和 --keyFile
 * 2. 环境变量：GOOGLE_APPLICATION_CREDENTIALS 和 GCLOUD_PROJECT
 * 3. 修改脚本中的配置（见下方）
 */

const admin = require('firebase-admin');
const sampleData = require('./firestore-sample-data.json');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=');
    if (key && value) {
      args[key.replace('--', '')] = value;
    }
  });
  return args;
}

// 初始化 Firebase Admin SDK
function initializeFirebase() {
  const args = parseArgs();
  const keyFile = args.keyFile || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = args.projectId || process.env.GCLOUD_PROJECT;

  // 方法1：使用命令行参数或环境变量指定的密钥文件
  if (keyFile && fs.existsSync(keyFile)) {
    try {
      const serviceAccount = require(path.resolve(keyFile));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
      console.log(`✓ Firebase Admin SDK 初始化成功（使用密钥文件：${keyFile}）`);
      console.log(`  项目ID：${projectId || serviceAccount.project_id}`);
      return;
    } catch (error) {
      console.error(`✗ 无法读取密钥文件 ${keyFile}:`, error.message);
    }
  }

  // 方法2：使用环境变量 applicationDefault
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId,
      });
      console.log('✓ Firebase Admin SDK 初始化成功（使用环境变量）');
      if (projectId) {
        console.log(`  项目ID：${projectId}`);
      }
      return;
    } catch (error) {
      console.error('✗ 使用环境变量初始化失败:', error.message);
    }
  }

  // 方法3：手动配置（请取消注释并填入您的配置）
  /*
  const serviceAccount = require('./path/to/your/service-account-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'your-project-id',
  });
  console.log('✓ Firebase Admin SDK 初始化成功（使用手动配置）');
  return;
  */

  // 如果所有方法都失败，显示错误信息
  console.error('\n❌ Firebase Admin SDK 初始化失败！');
  console.log('\n请使用以下方式之一配置：');
  console.log('\n方式1：命令行参数');
  console.log('  node firestore-init.js --projectId=your-project-id --keyFile=./service-account-key.json');
  console.log('\n方式2：环境变量');
  console.log('  Windows PowerShell:');
  console.log('    $env:GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"');
  console.log('    $env:GCLOUD_PROJECT="your-project-id"');
  console.log('  Linux/Mac:');
  console.log('    export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"');
  console.log('    export GCLOUD_PROJECT="your-project-id"');
  console.log('\n方式3：修改脚本中的手动配置部分');
  console.log('\n获取服务账号密钥文件：');
  console.log('  1. 访问 https://console.firebase.google.com/');
  console.log('  2. 选择您的项目');
  console.log('  3. 进入 项目设置 > 服务账号');
  console.log('  4. 点击"生成新的私钥"并下载 JSON 文件');
  process.exit(1);
}

if (!admin.apps.length) {
  initializeFirebase();
}

const db = admin.firestore();

/**
 * 将 ISO 8601 字符串转换为 Firestore Timestamp
 */
function toTimestamp(isoString) {
  if (!isoString) return null;
  return admin.firestore.Timestamp.fromDate(new Date(isoString));
}

/**
 * 初始化用戶數據
 */
async function initUsers() {
  console.log('\n📝 開始初始化用戶數據...');
  const batch = db.batch();
  let count = 0;

  for (const user of sampleData.users) {
    const userRef = db.collection('users').doc(user.id);
    batch.set(userRef, {
      name: user.name,
      email: user.email,
      createdAt: toTimestamp(user.createdAt),
    });
    count++;
  }

  await batch.commit();
  console.log(`✓ 成功創建 ${count} 個用戶`);
}

/**
 * 初始化專案數據
 */
async function initProjects() {
  console.log('\n📝 開始初始化專案數據...');
  let projectCount = 0;
  let chatroomCount = 0;
  let messageCount = 0;

  for (const project of sampleData.projects) {
    const projectRef = db.collection('projects').doc(project.id);
    
    // 準備專案文檔數據（排除 chatrooms）
    const projectData = {
      userId: project.userId,
      title: project.title,
      type: project.type,
      createdAt: toTimestamp(project.createdAt),
    };

    // 添加可選欄位
    if (project.keywords && project.keywords.length > 0) {
      projectData.keywords = project.keywords;
    }

    await projectRef.set(projectData);
    projectCount++;

    // 添加聊天室子集合
    if (project.chatrooms && project.chatrooms.length > 0) {
      for (const chatroom of project.chatrooms) {
        const chatroomRef = projectRef.collection('chatrooms').doc(chatroom.id);
        
        // 準備聊天室文檔數據（排除 messages）
        const chatroomData = {
          status: chatroom.status,
          aiPersonality: chatroom.aiPersonality,
          createdAt: toTimestamp(chatroom.createdAt),
        };

        // 添加可選欄位
        if (chatroom.completedAt) {
          chatroomData.completedAt = toTimestamp(chatroom.completedAt);
        }

        await chatroomRef.set(chatroomData);
        chatroomCount++;

        // 添加消息子集合
        if (chatroom.messages && chatroom.messages.length > 0) {
          const batch = db.batch();
          for (const message of chatroom.messages) {
            const messageRef = chatroomRef.collection('messages').doc(message.id);
            batch.set(messageRef, {
              role: message.role,
              content: message.content,
              timestamp: toTimestamp(message.timestamp),
            });
            messageCount++;
          }
          await batch.commit();
        }
      }
    }
  }

  console.log(`✓ 成功創建 ${projectCount} 個專案`);
  console.log(`✓ 成功創建 ${chatroomCount} 個聊天室`);
  console.log(`✓ 成功創建 ${messageCount} 條消息`);
}

/**
 * 初始化報告數據
 */
async function initReports() {
  console.log('\n📝 開始初始化報告數據...');
  const batch = db.batch();
  let count = 0;

  for (const report of sampleData.reports) {
    const reportRef = db.collection('reports').doc(report.id);
    batch.set(reportRef, {
      chatroomId: report.chatroomId,
      projectId: report.projectId,
      userId: report.userId,
      overallScore: report.overallScore,
      expression: report.expression,
      content: report.content,
      structure: report.structure,
      language: report.language,
      strengths: report.strengths,
      improvements: report.improvements,
      recommendations: report.recommendations,
      createdAt: toTimestamp(report.createdAt),
    });
    count++;
  }

  await batch.commit();
  console.log(`✓ 成功創建 ${count} 個報告`);
}

/**
 * 清空现有数据（可选，谨慎使用）
 */
async function clearExistingData() {
  console.log('\n⚠️  警告：此操作将删除所有现有数据！');
  console.log('如需清空数据，请取消注释 clearExistingData() 函数调用');
  return;

  // 取消註釋以下代碼以啟用清空功能
  /*
  console.log('\n🗑️  開始清空現有數據...');
  
  // 清空 reports
  const reportsSnapshot = await db.collection('reports').get();
  const reportsBatch = db.batch();
  reportsSnapshot.docs.forEach(doc => reportsBatch.delete(doc.ref));
  await reportsBatch.commit();
  console.log('✓ 已清空 reports 集合');

  // 清空 projects（包括子集合 chatrooms 和 messages）
  const projectsSnapshot = await db.collection('projects').get();
  for (const projectDoc of projectsSnapshot.docs) {
    // 清空 chatrooms 子集合（包括 messages）
    const chatroomsSnapshot = await projectDoc.ref.collection('chatrooms').get();
    for (const chatroomDoc of chatroomsSnapshot.docs) {
      // 清空 messages 子集合
      const messagesSnapshot = await chatroomDoc.ref.collection('messages').get();
      const messagesBatch = db.batch();
      messagesSnapshot.docs.forEach(doc => messagesBatch.delete(doc.ref));
      await messagesBatch.commit();
      
      // 刪除聊天室文檔
      await chatroomDoc.ref.delete();
    }
    
    // 刪除專案文檔
    await projectDoc.ref.delete();
  }
  console.log('✓ 已清空 projects 集合、chatrooms 和 messages 子集合');

  // 清空 users
  const usersSnapshot = await db.collection('users').get();
  const usersBatch = db.batch();
  usersSnapshot.docs.forEach(doc => usersBatch.delete(doc.ref));
  await usersBatch.commit();
  console.log('✓ 已清空 users 集合');
  */
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始初始化 Firestore 数据库...\n');

    // 可选：清空现有数据（默认禁用）
    // await clearExistingData();

  // 初始化數據
  await initUsers();
  await initProjects();
  await initReports();

  console.log('\n✅ 資料庫初始化完成！');
  console.log('\n📊 數據統計：');
  console.log(`   - 用戶：${sampleData.users.length} 個`);
  console.log(`   - 專案：${sampleData.projects.length} 個`);
  console.log(`   - 報告：${sampleData.reports.length} 個`);
  
  // 計算聊天室和消息總數
  const totalChatrooms = sampleData.projects.reduce((sum, p) => sum + (p.chatrooms?.length || 0), 0);
  const totalMessages = sampleData.projects.reduce((sum, p) => 
    sum + (p.chatrooms?.reduce((s, c) => s + (c.messages?.length || 0), 0) || 0), 0
  );
  console.log(`   - 聊天室：${totalChatrooms} 個`);
  console.log(`   - 消息：${totalMessages} 條`);

  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  });
}

module.exports = { initUsers, initProjects, initReports };

