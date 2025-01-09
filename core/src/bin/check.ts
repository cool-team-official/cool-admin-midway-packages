export async function check() {
  try {
    console.log('Running check command...');
    // 在这里实现检查逻辑
  } catch (error) {
    console.error('Check failed:', error);
    process.exit(1);
  }
}
