<template>
  <Transition name="modal">
    <div v-if="isOpen" class="modal-mask">
      <div class="modal-wrapper" @click.self="onCancel">
        <div class="modal-container">
          <div class="modal-body">
            <slot name="body">
              {{ message }}
            </slot>
          </div>

          <div class="modal-footer">
            <button class="modal-btn cancel" @click="onCancel">
              {{ cancelText }}
            </button>
            <button class="modal-btn confirm" @click="onConfirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  message: {
    type: String,
    default: '',
  },
  confirmText: {
    type: String,
    default: '确定',
  },
  cancelText: {
    type: String,
    default: '取消',
  },
})

const emit = defineEmits(['confirm', 'cancel'])

const onConfirm = () => {
  emit('confirm')
}

const onCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: table;
  transition: opacity 0.3s ease;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  width: 300px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  transition: all 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.modal-body {
  margin: 10px 0 20px;
  font-size: 16px;
  text-align: center;
  color: #333;
  white-space: pre-line;
}

.modal-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.modal-btn {
  flex: 1;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  outline: none;
}

.modal-btn.cancel {
  background-color: #f5f5f5;
  color: #333;
}

.modal-btn.confirm {
  background-color: #fe2c55; /* Douyin primary color */
  color: white;
}

/* Transition styles */
.modal-enter-from {
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>

