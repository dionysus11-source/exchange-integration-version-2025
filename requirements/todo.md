로그인 기능을 추가하려고 한다.

1. 현재 랜딩 페이지는 로그인 했을때만 보여주도록 변경한다.
2. 로그인 하지 않았을때는 id, password 입력창과 현재 프로그램 이름을 보여주도록 한다.
3. 로그인 가능한 id와 password는 json 형태로 파일로 관리하고 git에는 전송하지 않도록 gitignore에 추가한다.
4. 로그인을 하면 텔레그램에 메시지를 보낼때 token과 chat id는 입력 받을 필요가 없으므로 token과 chat id도 별도의 json 파일로 저장해서 보낼때 쓰도록 한다.
5. token과 chat id 저장한 것도 gitignore에 추가하여 git에 전송하지 않도록 한다.

