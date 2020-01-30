# LOL_RuneSimulator
HTML5 Canvas Practice

```
<script type="text/javascript" src="./LOL_RuneSimulator.js"></script>
<script>
    LOL_RuneSimulator('ko')
    .then(data => {
        document.body.appendChild(data.canvas);
    })
    .catch(err => {
        console.log(err);
    });
</script>
```
