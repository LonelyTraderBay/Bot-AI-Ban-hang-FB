"""Regression checks for token preservation and generated documentation ownership."""
import copy, importlib.util, pathlib, unittest

spec=importlib.util.spec_from_file_location('release_validator',pathlib.Path(__file__).with_name('validate-release.py'))
validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)

class TokenExtensionTests(unittest.TestCase):
    def setUp(self):
        self.approved={'theme':'dark-only','colors':{'accent':'#FFC857'},'radius':{'control':8}}
        self.current=copy.deepcopy(self.approved);self.current['radius']['bubble']=20
        self.record={'scope':'EXISTING_NON_PALETTE_ADDITIVE_FRONTEND_TOKENS','currentSource':{'path':'design/tokens.json','sha256':'current'},'addedLeafPaths':['radius.bubble']}
    def result(self):
        return validator.token_extension_integrity(self.approved,self.current,self.record,'current')
    def test_existing_additive_role_is_accepted(self):
        self.assertEqual(self.result(),(True,True))
    def test_changed_approved_color_fails_even_with_a_current_digest(self):
        self.current['colors']['accent']='#FFFFFF';self.assertFalse(self.result()[0])
    def test_removed_approved_leaf_fails(self):
        del self.current['radius']['control'];self.assertFalse(self.result()[0])
    def test_undeclared_addition_fails(self):
        self.current['radius']['extra']=30;self.assertFalse(self.result()[1])
    def test_duplicate_declaration_fails(self):
        self.record['addedLeafPaths'].append('radius.bubble');self.assertFalse(self.result()[1])
    def test_stale_digest_fails(self):
        self.record['currentSource']['sha256']='stale';self.assertFalse(self.result()[1])
    def test_palette_addition_is_not_an_allowed_extension(self):
        self.current['colors']['new']='#FFFFFF';self.record['addedLeafPaths'].append('colors.new')
        self.assertEqual(self.result(),(False,False))

class DocumentNavigationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec=importlib.util.spec_from_file_location('release_sync',pathlib.Path(__file__).with_name('sync-release.py'))
        cls.sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(cls.sync)
        cls.outputs=cls.sync.outputs()
    def test_index_selects_the_frontend_plan_and_effective_progress(self):
        index=self.outputs['DOCUMENT_INDEX.md']
        for path in ['execution/frontend-plan.json','execution/frontend-progress.json','execution/FRONTEND_PROGRESS.md']:
            self.assertIn(']('+path+')',index)
        self.assertIn('84 task/420 bước gốc chỉ đọc',index)
    def test_compiled_backlog_file_references_resolve_from_the_kit_root(self):
        section=self.outputs['ARCHITECTURE_BLUEPRINT.md'].split('<!-- SOURCE: docs/14_IMPLEMENTATION_BACKLOG.md -->',1)[1].split('<!-- SOURCE:',1)[0]
        for path in ['execution/plan.json','execution/progress.json','execution/tasks/T001.md','IMPLEMENTATION_PLAN.md']:
            self.assertIn('`'+path+'`',section)
            self.assertTrue((self.sync.R/path).is_file())
            self.assertNotIn('`../'+path+'`',section)

if __name__=='__main__':unittest.main()
