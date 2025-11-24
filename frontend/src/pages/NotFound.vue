<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <h1>404</h1>
      <p>页面不存在</p>
      <router-link to="/feed" class="btn-primary">返回首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.not-found-content {
  text-align: center;
  background: white;
  padding: 60px 40px;
  border-radius: 8px;
}

h1 {
  font-size: 64px;
  margin: 0;
  color: #667eea;
}

p {
  font-size: 20px;
  color: #999;
  margin: 20px 0 40px 0;
}
</style>

