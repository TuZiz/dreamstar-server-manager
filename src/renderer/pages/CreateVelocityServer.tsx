import { ManagedInstanceForm } from '../components/ManagedInstanceForm';

export function CreateVelocityServer() {
  return (
    <ManagedInstanceForm
      kind="velocity"
      title="添加 Velocity 托管实例"
      description="绑定一个已有 Velocity 目录，填写启动命令和 end 关闭命令。代理配置请在服务端自身配置文件中维护。"
      submitLabel="保存代理"
    />
  );
}
