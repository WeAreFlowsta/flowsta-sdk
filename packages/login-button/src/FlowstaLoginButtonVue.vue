<template>
  <button
    type="button"
    class="flowsta-login-button"
    :class="className"
    :disabled="disabled || isLoading"
    :aria-label="'Sign in with Flowsta'"
    :style="buttonStyle"
    @click="handleClick"
  >
    <slot>
      <img
        :src="imagePath"
        alt="Sign in with Flowsta"
        width="175"
        height="40"
        :style="imageStyle"
      />
    </slot>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { VueFlowstaLoginButtonProps, FlowstaLoginSuccess, FlowstaLoginError } from './types.js';
import { buildAuthorizationUrl } from './utils/oauth.js';

/**
 * Flowsta Login Button component for Vue 3
 * 
 * @example
 * ```vue
 * <FlowstaLoginButton
 *   clientId="your-client-id"
 *   redirectUri="https://yourapp.com/callback"
 *   :scopes="['profile', 'email']"
 *   variant="dark-pill"
 *   @success="handleSuccess"
 *   @error="handleError"
 * />
 * ```
 */

const props = withDefaults(defineProps<VueFlowstaLoginButtonProps>(), {
  scopes: () => ['profile'],
  variant: 'dark-pill',
  className: '',
  disabled: false,
});

const emit = defineEmits<{
  success: [data: FlowstaLoginSuccess];
  error: [error: FlowstaLoginError];
  click: [];
}>();

const isLoading = ref(false);

const imagePath = computed(() => {
  const imageName = `flowsta_signin_web_${props.variant.replace('-', '_')}`;
  return `/node_modules/@flowsta/login-button/assets/svg/${imageName}.svg`;
});

const buttonStyle = computed(() => ({
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: props.disabled || isLoading.value ? 'not-allowed' : 'pointer',
  opacity: props.disabled || isLoading.value ? 0.6 : 1,
  transition: 'opacity 0.2s ease',
}));

const imageStyle = {
  display: 'block',
  maxWidth: '100%',
  height: 'auto',
};

const handleClick = async () => {
  if (props.disabled || isLoading.value) return;

  isLoading.value = true;

  try {
    emit('click');

    const { url } = await buildAuthorizationUrl({
      clientId: props.clientId,
      redirectUri: props.redirectUri,
      scopes: props.scopes,
      loginUrl: props.loginUrl,
    });

    window.location.href = url;
  } catch (error) {
    isLoading.value = false;
    emit('error', {
      error: 'authorization_failed',
      errorDescription: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
</script>

<style scoped>
.flowsta-login-button {
  /* Additional styles can be added here */
}
</style>

