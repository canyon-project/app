import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, Button, Card, message } from "antd";
import { useRequest } from "ahooks";
import BasicLayout from "@/layouts/BasicLayout";
import { getRepo, updateRepo } from "@/services/repo";

const RepoEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { data: repo, loading } = useRequest(() => getRepo(id!), { ready: !!id });

  useEffect(() => {
    if (repo) {
      form.setFieldsValue({
        description: repo.description,
        config: repo.config,
        bu: repo.bu,
      });
    }
  }, [repo, form]);

  const { run: doUpdate, loading: submitting } = useRequest(
    async (values: { description?: string; config?: string; bu?: string }) => {
      await updateRepo(id!, {
        description: values.description,
        config: values.config,
        bu: values.bu,
      });
    },
    { manual: true },
  );

  const handleSubmit = async (values: { description?: string; config?: string; bu?: string }) => {
    await doUpdate(values);
    message.success("更新成功");
    navigate("/repos");
  };

  if (loading || !repo) {
    return (
      <BasicLayout>
        <Card loading={loading}>加载中...</Card>
      </BasicLayout>
    );
  }

  return (
    <BasicLayout>
      <Card title={`编辑仓库 - ${repo.pathWithNamespace}`} className="max-w-2xl">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="ID">
            <Input value={repo.id} disabled />
          </Form.Item>
          <Form.Item label="Provider">
            <Input value={repo.provider} disabled />
          </Form.Item>
          <Form.Item label="路径">
            <Input value={repo.pathWithNamespace} disabled />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="仓库描述" />
          </Form.Item>
          <Form.Item name="config" label="Config">
            <Input.TextArea rows={4} placeholder="配置（JSON 等）" />
          </Form.Item>
          <Form.Item name="bu" label="BU">
            <Input placeholder="业务单元" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" loading={submitting}>
              保存
            </Button>
            <Button className="ml-3" onClick={() => navigate("/repos")}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </BasicLayout>
  );
};

export default RepoEditPage;
