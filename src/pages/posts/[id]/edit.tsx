import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, Button, Switch, Card, message } from "antd";
import { useRequest } from "ahooks";
import BasicLayout from "@/layouts/BasicLayout";
import { getPost, updatePost } from "@/services/post";

const PostEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const postId = id ? parseInt(id, 10) : 0;

  const { data: post, loading } = useRequest(
    () => getPost(postId),
    { ready: !!id && !Number.isNaN(postId) },
  );

  useEffect(() => {
    if (post) {
      form.setFieldsValue({
        title: post.title,
        content: post.content ?? "",
        published: post.published,
      });
    }
  }, [post, form]);

  const { run: doUpdate, loading: submitting } = useRequest(
    async (values: { title: string; content?: string; published: boolean }) => {
      await updatePost(postId, {
        title: values.title,
        content: values.content,
        published: values.published ?? false,
      });
    },
    { manual: true },
  );

  const handleSubmit = async (values: { title: string; content?: string; published: boolean }) => {
    await doUpdate(values);
    message.success("更新成功");
    navigate("/posts");
  };

  if (loading || !post) {
    return (
      <BasicLayout>
        <Card loading={loading}>加载中...</Card>
      </BasicLayout>
    );
  }

  return (
    <BasicLayout>
      <Card title="编辑文章" className="max-w-2xl">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: "请输入标题" }]}
          >
            <Input placeholder="文章标题" size="large" />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <Input.TextArea rows={8} placeholder="文章内容" />
          </Form.Item>
          <Form.Item name="published" label="发布" valuePropName="checked">
            <Switch checkedChildren="已发布" unCheckedChildren="草稿" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" loading={submitting}>
              保存
            </Button>
            <Button className="ml-3" onClick={() => navigate("/posts")}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </BasicLayout>
  );
};

export default PostEditPage;
