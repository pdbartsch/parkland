import unittest
from parklandapp import create_app

class TestMathQuiz(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['WTF_CSRF_ENABLED'] = False
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_multiply_page_loads(self):
        response = self.client.get('/multiply')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Current Multiplication Quiz", response.data)

    def test_multiply_submission_correct(self):
        self.client.get('/multiply')
        with self.client.session_transaction() as sess:
            solution = sess['solution']
        
        response = self.client.post('/multiply', data={'user_answer': solution}, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Correct", response.data)

    def test_multiply_submission_incorrect(self):
        self.client.get('/multiply')
        with self.client.session_transaction() as sess:
            solution = sess['solution']
            wrong_answer = solution + 1
        
        response = self.client.post('/multiply', data={'user_answer': wrong_answer}, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Try again", response.data)

if __name__ == '__main__':
    unittest.main()
